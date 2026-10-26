import 'server-only';
import { decrypt, encrypt } from '@epapers/server/lib/encryption';
import { createHash, randomUUID } from 'node:crypto';
import { portalOrigins } from '@epapers/config/portals';
import type { User } from '@epapers/database/client';
import { db, withTransactionRetry, type TransactionClient } from '@epapers/database';
import { fail } from '@epapers/config/errors';
import { hashPassword, verifyPassword, opaqueToken, tokenHash, otp } from '@epapers/auth/crypto';
import { signAccess, verifyAccess, signReauthentication } from '@epapers/auth/jwt';
import { rateLimit } from '@epapers/server/lib/rate-limit';
import { otpEmail, resetEmail, adminCodeEmail } from '@epapers/server/lib/email/templates';
import { privateUser } from '@epapers/server/modules/auth/dto';
import { audit, challenge } from '@epapers/server/modules/auth/repository';
import { removeProfileImage } from '@epapers/server/modules/auth/avatar';
import { username as usernameSchema } from '@epapers/server/modules/auth/schemas';
import { nextUsernameChangeAt } from '@epapers/server/modules/auth/username-policy';
const generic = { message: 'If eligible, an email will be sent. Delivery may be delayed.' };

type PortalGrant = { token: string; challenge: string; redirectUri: string; expiresAt: number; sessionExpiresAt: string };
function validatePortalCallback(redirectUri: string) {
    if (![portalOrigins.contributor, portalOrigins.lecturer, portalOrigins.admin].some(origin => redirectUri === origin + '/auth/callback'))
        fail(422, 'INVALID_CALLBACK', 'Unknown portal callback');
}

// The encrypted authorization code is bound to PKCE and an exact callback.
// Its backing session expires in two minutes and is consumed transactionally.
// Refresh credentials themselves never appear in a browser URL or storage.
export async function createPortalGrant(userId: string, sessionId: string, input: { challenge: string; redirectUri: string }) {
    validatePortalCallback(input.redirectUri);
    const grant = await withTransactionRetry(async tx => {
        await lockUser(tx, userId);
        const parent = await tx.userSession.findFirst({ where: { id: sessionId, userId, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } } });
        const user = await tx.user.findUnique({ where: { id: userId } });
        active(user);
        if (!parent || (user.role === 'ADMIN' && !parent.adminEmailVerifiedAt)) fail(401, 'UNAUTHORIZED', 'Please sign in again');
        const issued = await issueSession(tx, user, parent.familyId);
        const expiresAt = Math.min(Date.now() + 120000, parent.expiresAt.getTime());
        await tx.userSession.update({ where: { id: issued.session.id }, data: { expiresAt: new Date(expiresAt) } });
        return { token: issued.refreshToken, ...input, expiresAt, sessionExpiresAt: parent.expiresAt.toISOString() } satisfies PortalGrant;
    });
    return { code: Buffer.from(encrypt(grant, 'portal-grant')).toString('base64url') };
}

export async function exchangePortalGrant(input: { code: string; verifier: string; redirectUri: string }, origin: string | null) {
    validatePortalCallback(input.redirectUri);
    let grant: PortalGrant;
    try { grant = decrypt<PortalGrant>(Buffer.from(input.code, 'base64url').toString('utf8'), 'portal-grant'); }
    catch { fail(401, 'INVALID_GRANT', 'Sign-in link is invalid or expired'); }
    const challenge = createHash('sha256').update(input.verifier).digest('base64url');
    if (grant.expiresAt <= Date.now() || grant.redirectUri !== input.redirectUri || grant.challenge !== challenge || new URL(input.redirectUri).origin !== origin)
        fail(401, 'INVALID_GRANT', 'Sign-in link is invalid or expired');
    const result = await withTransactionRetry(async tx => {
        const pending = await tx.userSession.findUnique({ where: { refreshTokenHash: tokenHash(grant.token) } });
        if (!pending) fail(401, 'INVALID_GRANT', 'Sign-in link is invalid or expired');
        await lockUser(tx, pending.userId);
        const current = await tx.userSession.findUnique({ where: { id: pending.id } });
        const user = await tx.user.findUnique({ where: { id: pending.userId } });
        active(user);
        if (!current || current.revokedAt || current.rotatedAt || current.expiresAt <= new Date() || (user.role === 'ADMIN' && !current.adminEmailVerifiedAt))
            fail(401, 'INVALID_GRANT', 'Sign-in link is invalid or expired');
        await tx.userSession.update({ where: { id: current.id }, data: { rotatedAt: new Date(), revokedAt: new Date() } });
        const next = await issueSession(tx, user, current.familyId);
        const expiresAt = new Date(grant.sessionExpiresAt);
        await tx.userSession.update({ where: { id: next.session.id }, data: { expiresAt } });
        return { ...next, session: { ...next.session, expiresAt }, user };
    });
    return { refreshToken: result.refreshToken, session: result.session, accessToken: await signAccess(result.user, result.session.id), user: privateUser(result.user) };
}

async function lockUser(tx: TransactionClient, id: string) { await tx.$queryRaw `SELECT id FROM users WHERE id=${id}::UUID FOR UPDATE`; }
function active(user: User | null): asserts user is User { if (!user || user.deletedAt || user.status !== 'ACTIVE')
    fail(401, 'UNAUTHORIZED', 'Authentication required'); }
async function enqueue(tx: TransactionClient, message: ReturnType<typeof otpEmail>, priority = false) { await tx.job.create({ data: { type: priority ? 'email_otp' : 'email', payload: { encrypted: encrypt(message, 'email') } } }); }
async function newChallenge(tx: TransactionClient, user: User, kind: 'otp' | 'reset') {
    const token = kind === 'otp' ? otp() : opaqueToken();
    await tx.$executeRaw `UPDATE auth_challenges SET consumed_at=now() WHERE user_id=${user.id}::UUID AND kind=${kind} AND consumed_at IS NULL`;
    await tx.$executeRaw `INSERT INTO auth_challenges(user_id,kind,token_hash,expires_at) VALUES (${user.id}::UUID,${kind},${tokenHash(token)},${new Date(Date.now() + (kind === 'otp' ? 600000 : 1800000))})`;
    await enqueue(tx, kind === 'otp' ? otpEmail(user.email, token) : resetEmail(user.email, token), kind === 'otp');
}
export async function register(input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
}) {
    await rateLimit('register-email:' + tokenHash(input.email), 5, 3600);
    const passwordHash = await hashPassword(input.password);
    return withTransactionRetry(async (tx) => {
        const settings = await tx.$queryRaw<Array<{
            value: unknown;
        }>> `SELECT value FROM app_settings WHERE key='lockdown'`;
        if (settings[0]?.value === true)
            fail(403, 'LOCKDOWN', 'Registration is temporarily disabled');
        const existing = await tx.user.findUnique({ where: { emailNormalized: input.email } });
        if (existing)
            return generic;
        const reserved = await tx.$queryRaw<Array<{
            username_normalized: string;
        }>> `SELECT username_normalized FROM username_registry WHERE username_normalized=${input.username.toLowerCase()}`;
        if (reserved.length)
            fail(409, 'USERNAME_TAKEN', 'Username is unavailable');
        const user = await tx.user.create({ data: { username: input.username, usernameNormalized: input.username.toLowerCase(), email: input.email, emailNormalized: input.email, fullName: input.fullName, passwordHash, role: 'CONTRIBUTOR' } });
        await tx.$executeRaw `INSERT INTO username_registry(username_normalized,user_id) VALUES (${user.usernameNormalized},${user.id}::UUID)`;
        await newChallenge(tx, user, 'otp');
        await audit(tx, user.id, 'REGISTER');
        return generic;
    });
}
export async function resend(email: string, kind: 'otp' | 'reset') {
    await rateLimit(kind + '-email:' + tokenHash(email), 5, 3600);
    return withTransactionRetry(async (tx) => {
        const user = await tx.user.findUnique({ where: { emailNormalized: email } });
        if (!user || user.deletedAt || user.status !== 'ACTIVE' || (kind === 'otp' && user.emailVerifiedAt))
            return generic;
        await lockUser(tx, user.id);
        const previous = await challenge(tx, user.id, kind);
        if (previous && Date.now() - previous.created_at.getTime() < 60000)
            return generic;
        await newChallenge(tx, user, kind);
        return generic;
    });
}
export async function verifyOtp(email: string, code: string) {
    await rateLimit('otp-email:' + tokenHash(email), 10, 600);
    const result = await withTransactionRetry(async (tx) => {
        const user = await tx.user.findUnique({ where: { emailNormalized: email } });
        if (!user || user.deletedAt || user.status !== 'ACTIVE')
            return false;
        await lockUser(tx, user.id);
        const c = await challenge(tx, user.id, 'otp');
        if (!c || c.consumed_at || c.expires_at <= new Date() || c.attempts >= 5)
            return false;
        await tx.$executeRaw `UPDATE auth_challenges SET attempts=attempts+1 WHERE id=${c.id}::UUID`;
        if (c.token_hash !== tokenHash(code))
            return false;
        await tx.$executeRaw `UPDATE auth_challenges SET consumed_at=now() WHERE id=${c.id}::UUID`;
        await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
        return true;
    });
    if (!result)
        fail(422, 'INVALID_CODE', 'Code is invalid or expired');
    return { message: 'Email verified' };
}
async function issueSession(tx: TransactionClient, user: User, familyId: string = randomUUID(), rememberAdmin = false) {
    const refreshToken = opaqueToken();
    const duration = user.role === 'ADMIN' ? (rememberAdmin ? 7 * 86400000 : 3600000) : 30 * 86400000;
    const session = await tx.userSession.create({ data: { userId: user.id, familyId, refreshTokenHash: tokenHash(refreshToken), adminEmailVerifiedAt: user.role === 'ADMIN' ? new Date() : null, expiresAt: new Date(Date.now() + duration) } });
    return { session, refreshToken };
}
export async function login(usernameOrEmail: string, password: string, adminOnly = false) {
    const email = usernameOrEmail.toLowerCase();
    await rateLimit('login-email:' + tokenHash(email), 10, 900);
    const user = await db.user.findFirst({ where: { OR: [{ emailNormalized: email }, { usernameNormalized: email }] } });
    if (user)
        await rateLimit('login-account:' + user.id, 10, 900);
    // Burn the same Argon2 work for unknown accounts to reduce account enumeration.
    const ok = user ? await verifyPassword(user.passwordHash, password) : (await hashPassword(opaqueToken() + 'A1'), false);
    if (!ok)
        fail(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    active(user);
    if (adminOnly && user.role !== 'ADMIN')
        fail(403, 'FORBIDDEN', 'Admin account required');
    if (user.role === 'ADMIN') return startAdminChallenge(user, 'login');
    const issued = await withTransactionRetry(async (tx) => { await lockUser(tx, user.id); const current = await tx.user.findUnique({ where: { id: user.id } }); active(current); if (current.passwordHash !== user.passwordHash || current.role !== user.role)
        fail(401, 'INVALID_CREDENTIALS', 'Please log in again'); const issued = await issueSession(tx, current); await audit(tx, current.id, 'LOGIN'); return issued; });
    return { refreshToken: issued.refreshToken, session: { id: issued.session.id, expiresAt: issued.session.expiresAt }, accessToken: await signAccess(user, issued.session.id), user: privateUser(user) };
}
/** Link a verified Supabase Google identity to a local account and issue the usual EPapers session. */
export async function loginWithGoogle(profile: {
    id: string;
    email: string;
    emailVerifiedAt: Date;
    fullName?: string;
    avatarUrl?: string;
    username?: string;
}) {
    const email = profile.email.trim().toLowerCase();
    if (!email || !profile.emailVerifiedAt || !/^[0-9a-f-]{36}$/i.test(profile.id))
        fail(401, 'INVALID_IDENTITY', 'Google account could not be verified');
    await rateLimit('google-account:' + tokenHash(profile.id), 20, 900);
    const candidateName = profile.fullName?.trim().slice(0, 120) || email.split('@')[0];
    const displayName = candidateName.length >= 2 ? candidateName : 'Google user';
    const result = await withTransactionRetry(async tx => {
        const linked = await tx.oAuthIdentity.findUnique({ where: { provider_providerUserId: { provider: 'google', providerUserId: profile.id } } });
        const existing = linked
            ? await tx.user.findUnique({ where: { id: linked.userId } })
            : await tx.user.findUnique({ where: { emailNormalized: email } });
        if (linked && (!existing || existing.emailNormalized !== email))
            fail(409, 'ACCOUNT_LINK_CONFLICT', 'This Google account needs account support before sign-in');
        if (existing && !existing.emailVerifiedAt)
            fail(409, 'VERIFY_EMAIL_FIRST', 'Verify your EPapers email before using Google sign-in');
        if (existing?.role === 'ADMIN')
            fail(403, 'ADMIN_VERIFICATION_REQUIRED', 'Administrators must use password and email verification');
        if (existing) active(existing);
        if (!existing) {
            const settings = await tx.$queryRaw<Array<{ value: unknown }>> `SELECT value FROM app_settings WHERE key='lockdown'`;
            if (settings[0]?.value === true) fail(403, 'LOCKDOWN', 'Registration is temporarily disabled');
        }
        const handleBase = (profile.fullName || email.split('@')[0]).toLowerCase()
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 16) || 'user';
        const preferred = profile.username ? usernameSchema.safeParse(profile.username.toLowerCase()) : null;
        if (preferred && !preferred.success) fail(422, 'INVALID_USERNAME', 'Choose a valid username');
        const username = preferred?.data ?? handleBase + '_' + profile.id.replaceAll('-', '').slice(0, 12).toLowerCase();
        if (!existing && await tx.usernameRegistry.findUnique({ where: { usernameNormalized: username } }))
            fail(409, 'USERNAME_TAKEN', 'Username is unavailable');
        // Existing Google users keep their password credential; only new accounts need a random unusable hash.
        const user = existing ?? await tx.user.upsert({
            where: { emailNormalized: email },
            create: {
                username,
                usernameNormalized: username,
                email,
                emailNormalized: email,
                fullName: displayName,
                passwordHash: await hashPassword(opaqueToken() + 'A1'),
                emailVerifiedAt: profile.emailVerifiedAt,
                role: 'CONTRIBUTOR',
            },
            update: {},
        });
        active(user);
        // Never allow an OAuth callback to bypass the administrator's email code.
        if (user.role === 'ADMIN') fail(403, 'ADMIN_VERIFICATION_REQUIRED', 'Administrators must use password and email verification');
        if (!existing) {
            await tx.usernameRegistry.create({ data: { usernameNormalized: username, userId: user.id } });
            await audit(tx, user.id, 'REGISTER_GOOGLE');
        }
        await tx.oAuthIdentity.upsert({
            where: { provider_providerUserId: { provider: 'google', providerUserId: profile.id } },
            create: { userId: user.id, provider: 'google', providerUserId: profile.id, avatarUrl: profile.avatarUrl || null },
            update: { avatarUrl: profile.avatarUrl || null },
        });
        const issued = await issueSession(tx, user);
        await audit(tx, user.id, 'LOGIN_GOOGLE');
        return { user, ...issued };
    });
    return {
        refreshToken: result.refreshToken,
        session: { id: result.session.id, expiresAt: result.session.expiresAt },
        accessToken: await signAccess(result.user, result.session.id),
        user: privateUser(result.user),
    };
}
export async function refresh(token: string) {
    const result = await withTransactionRetry(async (tx) => {
        const session = await tx.userSession.findUnique({ where: { refreshTokenHash: tokenHash(token) } });
        if (!session)
            return null;
        await lockUser(tx, session.userId);
        const current = await tx.userSession.findUnique({ where: { id: session.id } });
        if (!current)
            return null;
        if (current.rotatedAt) {
            await tx.userSession.updateMany({ where: { familyId: current.familyId }, data: { revokedAt: new Date() } });
            return null;
        }
        if (current.revokedAt || current.expiresAt <= new Date())
            return null;
        const user = await tx.user.findUnique({ where: { id: current.userId } });
        if (!user || user.deletedAt || user.status !== 'ACTIVE') {
            await tx.userSession.updateMany({ where: { userId: current.userId }, data: { revokedAt: new Date() } });
            return null;
        }
        // Manual promotion must not turn an existing contributor refresh cookie into an admin session.
        if (user.role === 'ADMIN' && !current.adminEmailVerifiedAt) {
            await tx.userSession.updateMany({ where: { familyId: current.familyId }, data: { revokedAt: new Date() } });
            return null;
        }
        await tx.userSession.update({ where: { id: current.id }, data: { rotatedAt: new Date(), revokedAt: new Date() } });
        const next = await issueSession(tx, user, current.familyId);
        // Refresh does not extend the session family's absolute expiry (especially admins).
        await tx.userSession.update({ where: { id: next.session.id }, data: { expiresAt: current.expiresAt } });
        next.session.expiresAt = current.expiresAt;
        return { ...next, user };
    });
    if (!result)
        fail(401, 'INVALID_SESSION', 'Please log in again');
    return { refreshToken: result.refreshToken, session: { id: result.session.id, expiresAt: result.session.expiresAt }, accessToken: await signAccess(result.user, result.session.id), user: privateUser(result.user) };
}
export { authenticate, authorize } from '@epapers/auth/server';
export async function logout(token: string) { await withTransactionRetry(async (tx) => { const session = await tx.userSession.findUnique({ where: { refreshTokenHash: tokenHash(token) } }); if (session) {
    await lockUser(tx, session.userId);
    await tx.userSession.updateMany({ where: { familyId: session.familyId }, data: { revokedAt: new Date() } });
    await audit(tx, session.userId, 'LOGOUT');
} }); return { message: 'Logged out' }; }
export async function resetPassword(token: string, password: string) {
    await rateLimit('reset-token:' + tokenHash(token), 5, 1800);
    const passwordHash = await hashPassword(password);
    const ok = await withTransactionRetry(async (tx) => {
        const rows = await tx.$queryRaw<Array<{
            user_id: string;
        }>> `SELECT user_id FROM auth_challenges WHERE token_hash=${tokenHash(token)} AND kind='reset' LIMIT 1`;
        if (!rows[0])
            return false;
        await lockUser(tx, rows[0].user_id);
        const c = await challenge(tx, rows[0].user_id, 'reset');
        const user = await tx.user.findUnique({ where: { id: rows[0].user_id } });
        if (!c || c.token_hash !== tokenHash(token) || c.consumed_at || c.expires_at <= new Date() || !user || user.deletedAt || user.status !== 'ACTIVE')
            return false;
        await tx.$executeRaw `UPDATE auth_challenges SET consumed_at=now() WHERE id=${c.id}::UUID`;
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.userSession.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
        await audit(tx, user.id, 'PASSWORD_RESET');
        return true;
    });
    if (!ok)
        fail(422, 'INVALID_TOKEN', 'Reset link is invalid or expired');
    return { message: 'Password reset' };
}
export async function changePassword(userId: string, sessionId: string, currentPassword: string, password: string) {
    await rateLimit('change-password:' + userId, 5, 900);
    const passwordHash = await hashPassword(password);
    await withTransactionRetry(async (tx) => {
        await lockUser(tx, userId);
        const user = await tx.user.findUnique({ where: { id: userId } });
        active(user);
        const session = await tx.userSession.findFirst({ where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } } });
        if (!session) fail(401, 'UNAUTHORIZED', 'Please sign in again');
        if (!(await verifyPassword(user.passwordHash, currentPassword)))
            fail(422, 'INVALID_PASSWORD', 'Current password is incorrect.');
        if (currentPassword === password)
            fail(422, 'UNCHANGED_PASSWORD', 'Choose a new password different from your current password.');
        await tx.user.update({ where: { id: userId }, data: { passwordHash } });
        await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.$executeRaw `UPDATE auth_challenges SET consumed_at=now() WHERE user_id=${userId}::UUID AND consumed_at IS NULL`;
        await tx.$executeRaw `UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=${userId}::UUID AND consumed_at IS NULL`;
        await audit(tx, userId, 'PASSWORD_CHANGED');
    });
    return { message: 'Password changed. Please sign in again.' };
}
export async function availability(username: string) { const rows = await db.$queryRaw<Array<{
    username_normalized: string;
}>> `SELECT username_normalized FROM username_registry WHERE username_normalized=${username.toLowerCase()}`; return { available: rows.length === 0 }; }
export async function updateProfile(userId: string, input: {
    username?: string;
    fullName?: string;
    bio?: string;
    avatarId?: string | null;
}) {
    const result = await withTransactionRetry(async (tx) => {
        await lockUser(tx, userId);
        const user = await tx.user.findUnique({ where: { id: userId } });
        active(user);
        if (input.avatarId?.startsWith('p_') && input.avatarId !== user.avatarId)
            fail(422, 'INVALID_AVATAR', 'Upload a profile image before selecting it');
        if (input.username && input.username.toLowerCase() !== user.usernameNormalized) {
            const nextChangeAt = nextUsernameChangeAt(user.usernameChangedAt);
            if (nextChangeAt && nextChangeAt.getTime() > Date.now())
                fail(409, 'USERNAME_COOLDOWN', `You can change your username again after ${nextChangeAt.toISOString()}.`);
            const taken = await tx.$queryRaw<Array<{
                user_id: string;
            }>> `SELECT user_id FROM username_registry WHERE username_normalized=${input.username.toLowerCase()}`;
            if (taken.length)
                fail(409, 'USERNAME_TAKEN', 'Username is unavailable');
            await tx.$executeRaw `UPDATE username_registry SET is_current=false,retired_at=now() WHERE user_id=${userId}::UUID AND is_current`;
            await tx.$executeRaw `INSERT INTO username_registry(username_normalized,user_id) VALUES (${input.username.toLowerCase()},${userId}::UUID)`;
            await tx.user.update({ where: { id: userId }, data: { username: input.username, usernameNormalized: input.username.toLowerCase(), usernameChangedAt: new Date() } });
            await audit(tx, userId, 'USERNAME_CHANGED');
        }
        const updated = await tx.user.update({ where: { id: userId }, data: { fullName: input.fullName, bio: input.bio, avatarId: input.avatarId } });
        if (input.bio !== undefined || input.fullName !== undefined || input.avatarId !== undefined)
            await audit(tx, userId, 'PROFILE_UPDATED');
        return { profile: privateUser(updated), previousAvatar: user.avatarId };
    });
    if (input.avatarId !== undefined && input.avatarId !== result.previousAvatar)
        await removeProfileImage(userId, result.previousAvatar);
    return result.profile;
}
export async function sessions(userId: string) { return (await db.userSession.findMany({ where: { userId, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 100 })).map(s => ({ id: s.id, createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString() })); }
export async function revokeSession(userId: string, id: string) { await withTransactionRetry(async (tx) => { await lockUser(tx, userId); const s = await tx.userSession.findFirst({ where: { id, userId } }); if (!s)
    fail(404, 'NOT_FOUND', 'Session not found'); await tx.userSession.updateMany({ where: { userId, familyId: s.familyId }, data: { revokedAt: new Date() } }); }); return { message: 'Session revoked' }; }
export async function logoutAll(userId: string) { await withTransactionRetry(async (tx) => { await lockUser(tx, userId); await tx.userSession.updateMany({ where: { userId }, data: { revokedAt: new Date() } }); await audit(tx, userId, 'LOGOUT_ALL'); }); return { message: 'All sessions revoked' }; }
export async function reauthenticate(userId: string, sid: string, password: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    active(user);
    if (user.role !== 'ADMIN' || !(await verifyPassword(user.passwordHash, password)))
        fail(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    return startAdminChallenge(user, 'reauth', sid);
}

export type AdminChallenge = {
    verificationRequired: true;
    challengeToken: string;
    expiresAt: string;
    resendAfter: string;
    message: string;
};
type AdminChallengeRow = {
    id: string; user_id: string; kind: string; session_id: string | null;
    code_hash: string; credential_hash: string; attempts: number | bigint;
    expires_at: Date; consumed_at: Date | null; created_at: Date;
};
const adminCredentialHash = (user: User) => tokenHash(user.passwordHash + '|' + user.emailNormalized);

async function startAdminChallenge(user: User, kind: 'login' | 'reauth', sid?: string): Promise<AdminChallenge> {
    await rateLimit(`admin-${kind}-email:${user.id}`, 5, 3600);
    const challengeToken = opaqueToken(), code = otp();
    const expiresAt = new Date(Date.now() + 600000), resendAfter = new Date(Date.now() + 60000);
    await withTransactionRetry(async tx => {
        await lockUser(tx, user.id);
        const current = await tx.user.findUnique({ where: { id: user.id } });
        active(current);
        if (current.role !== 'ADMIN' || adminCredentialHash(current) !== adminCredentialHash(user))
            fail(401, 'INVALID_CREDENTIALS', 'Please sign in again');
        if (sid && !await tx.userSession.findFirst({ where: { id: sid, userId: user.id, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } } }))
            fail(401, 'UNAUTHORIZED', 'Please sign in again');
        const previous = await tx.$queryRaw<AdminChallengeRow[]>`SELECT * FROM admin_auth_challenges WHERE user_id=${user.id}::UUID AND kind=${kind} ORDER BY created_at DESC LIMIT 1`;
        if (previous[0] && !previous[0].consumed_at && Date.now() - previous[0].created_at.getTime() < 60000)
            fail(429, 'CODE_COOLDOWN', 'Wait 60 seconds before requesting another code');
        await tx.$executeRaw`UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=${user.id}::UUID AND kind=${kind} AND consumed_at IS NULL`;
        await tx.$executeRaw`INSERT INTO admin_auth_challenges(user_id,kind,session_id,challenge_hash,code_hash,credential_hash,expires_at) VALUES (${user.id}::UUID,${kind},${sid ?? null}::UUID,${tokenHash(challengeToken)},${tokenHash(challengeToken + ':' + code)},${adminCredentialHash(current)},${expiresAt})`;
        await enqueue(tx, adminCodeEmail(current.email, code, kind), true);
        await audit(tx, user.id, kind === 'login' ? 'ADMIN_LOGIN_CODE_SENT' : 'ADMIN_REAUTH_CODE_SENT');
    });
    return { verificationRequired: true, challengeToken, expiresAt: expiresAt.toISOString(), resendAfter: resendAfter.toISOString(), message: 'Enter the six-digit code sent to your account email.' };
}

async function consumeAdminChallenge<T>(challengeToken: string, code: string, kind: 'login' | 'reauth', action: (tx: TransactionClient, user: User) => Promise<T>, userId?: string, sid?: string): Promise<T> {
    await rateLimit('admin-code:' + tokenHash(challengeToken), 10, 600);
    const result = await withTransactionRetry(async tx => {
        const rows = await tx.$queryRaw<AdminChallengeRow[]>`SELECT * FROM admin_auth_challenges WHERE challenge_hash=${tokenHash(challengeToken)} LIMIT 1`;
        const initial = rows[0];
        if (!initial || initial.kind !== kind || (userId && initial.user_id !== userId) || (sid && initial.session_id !== sid)) return null;
        await lockUser(tx, initial.user_id);
        const locked = await tx.$queryRaw<AdminChallengeRow[]>`SELECT * FROM admin_auth_challenges WHERE id=${initial.id}::UUID FOR UPDATE`;
        const c = locked[0];
        const user = await tx.user.findUnique({ where: { id: initial.user_id } });
        if (!c || c.consumed_at || c.expires_at <= new Date() || Number(c.attempts) >= 5 || !user || user.status !== 'ACTIVE' || user.deletedAt || user.role !== 'ADMIN' || c.credential_hash !== adminCredentialHash(user)) return null;
        if (sid && !await tx.userSession.findFirst({ where: { id: sid, userId: user.id, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } } })) return null;
        // Return failure after committing the attempt, so invalid codes cannot bypass the limit.
        await tx.$executeRaw`UPDATE admin_auth_challenges SET attempts=attempts+1 WHERE id=${c.id}::UUID`;
        if (c.code_hash !== tokenHash(challengeToken + ':' + code)) return null;
        await tx.$executeRaw`UPDATE admin_auth_challenges SET consumed_at=now() WHERE id=${c.id}::UUID`;
        return { value: await action(tx, user) };
    });
    if (!result) fail(422, 'INVALID_CODE', 'Code is invalid or expired. Request a new code to try again.');
    return result.value;
}

export function verifyAdminLogin(challengeToken: string, code: string, rememberDevice = false) {
    return consumeAdminChallenge(challengeToken, code, 'login', async (tx, user) => {
        const issued = await issueSession(tx, user, randomUUID(), rememberDevice);
        await audit(tx, user.id, 'ADMIN_LOGIN');
        return { refreshToken: issued.refreshToken, session: { id: issued.session.id, expiresAt: issued.session.expiresAt }, accessToken: await signAccess(user, issued.session.id), user: privateUser(user) };
    });
}
export function verifyAdminReauthentication(userId: string, sid: string, challengeToken: string, code: string) {
    return consumeAdminChallenge(challengeToken, code, 'reauth', async (tx, user) => {
        await audit(tx, user.id, 'ADMIN_REAUTH');
        return { reauthToken: await signReauthentication(user.id, sid) };
    }, userId, sid);
}
