import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@epapers/database/client';
import { randomUUID } from 'node:crypto';

const mocks = vi.hoisted(() => ({ db: { user: { findFirst: vi.fn(), findUnique: vi.fn() }, userSession: { findUnique: vi.fn() } }, tx: {
    user: { findUnique: vi.fn() }, userSession: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    job: { create: vi.fn() }, $queryRaw: vi.fn(), $executeRaw: vi.fn(),
} }));
vi.mock('@epapers/database', () => ({ db: mocks.db, withTransactionRetry: async (action: (tx: unknown) => unknown) => action(mocks.tx) }));
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/auth/crypto', async importOriginal => ({ ...await importOriginal<object>(), verifyPassword: vi.fn(async (_hash: string, password: string) => password === 'Correct1'), hashPassword: vi.fn(async () => 'hash') }));
import { login, verifyAdminLogin, reauthenticate, verifyAdminReauthentication, refresh, authenticate } from '@epapers/server/modules/auth/service';
import { tokenHash } from '@epapers/auth/crypto';
import { decrypt } from '@epapers/server/lib/encryption';
import { verifyReauthentication, signAccess } from '@epapers/auth/jwt';

type Row = { id: string; user_id: string; kind: string; session_id: string | null; challenge_hash: string; code_hash: string; credential_hash: string; expires_at: Date; created_at: Date; consumed_at: Date | null; attempts: number };
let user: User, rows: Row[], emailCode: string;
beforeEach(() => {
    vi.clearAllMocks(); rows = []; emailCode = '';
    user = { id: randomUUID(), role: 'ADMIN', status: 'ACTIVE', deletedAt: null, passwordHash: 'hash', email: 'admin@example.com', emailNormalized: 'admin@example.com', username: 'admin', fullName: 'Admin', joinedAt: new Date(), xp: 0 } as User;
    mocks.db.user.findFirst.mockImplementation(async () => user);
    mocks.db.user.findUnique.mockImplementation(async () => user);
    mocks.tx.user.findUnique.mockImplementation(async () => user);
    mocks.tx.userSession.create.mockResolvedValue({ id: randomUUID(), expiresAt: new Date(Date.now() + 3600000) });
    mocks.tx.userSession.findFirst.mockResolvedValue({ id: 'session' });
    mocks.tx.job.create.mockImplementation(async ({ data }) => { const message = decrypt<{ text: string }>(data.payload.encrypted, 'email'); emailCode = message.text.match(/code is (\d{6})/)![1]; return {}; });
    mocks.tx.$queryRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
        const query = parts.join('?');
        if (query.includes('FROM users')) return [];
        if (query.includes('challenge_hash=')) return rows.filter(row => row.challenge_hash === values[0]);
        if (query.includes('WHERE id=')) return rows.filter(row => row.id === values[0]);
        return rows.filter(row => row.user_id === values[0] && row.kind === values[1]).slice(-1);
    });
    mocks.tx.$executeRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
        const query = parts.join('?');
        if (query.startsWith('INSERT INTO admin_auth_challenges')) rows.push({ id: randomUUID(), user_id: String(values[0]), kind: String(values[1]), session_id: values[2] as string | null, challenge_hash: String(values[3]), code_hash: String(values[4]), credential_hash: String(values[5]), expires_at: values[6] as Date, created_at: new Date(), consumed_at: null, attempts: 0 });
        if (query.includes('attempts=attempts+1')) rows.find(row => row.id === values[0])!.attempts++;
        if (query.startsWith('UPDATE admin_auth_challenges SET consumed_at')) {
            for (const row of rows) if (query.includes('WHERE id=') ? row.id === values[0] : row.user_id === values[0] && row.kind === values[1]) row.consumed_at = new Date();
        }
        return 1;
    });
});
async function start() { const result = await login(user.email, 'Correct1'); if (!('verificationRequired' in result)) throw new Error('Session issued before email verification'); return result; }

describe('administrator email verification', () => {
    it('issues no session before the emailed code, then accepts it only once', async () => {
        const challenge = await start();
        expect(mocks.tx.userSession.create).not.toHaveBeenCalled();
        expect(rows[0].code_hash).not.toBe(emailCode);
        const session = await verifyAdminLogin(challenge.challengeToken, emailCode);
        expect(session.user.role).toBe('admin');
        expect(mocks.tx.userSession.create.mock.calls[0][0].data.adminEmailVerifiedAt).toBeInstanceOf(Date);
        await expect(verifyAdminLogin(challenge.challengeToken, emailCode)).rejects.toThrow();
        expect(mocks.tx.userSession.create).toHaveBeenCalledTimes(1);
    });
    it('remembers an admin session for seven days only after the email code', async () => {
        const challenge = await start();
        expect(mocks.tx.userSession.create).not.toHaveBeenCalled();
        await verifyAdminLogin(challenge.challengeToken, emailCode, true);
        const expiresAt = mocks.tx.userSession.create.mock.calls[0][0].data.expiresAt as Date;
        expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(7 * 86400000 - 10000);
        expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(7 * 86400000);
    });
    it('commits wrong-code attempts and locks the challenge after five failures', async () => {
        const challenge = await start(); const correctCode = emailCode;
        const wrongCode = correctCode === '000000' ? '111111' : '000000';
        for (let attempt = 0; attempt < 5; attempt++) await expect(verifyAdminLogin(challenge.challengeToken, wrongCode)).rejects.toThrow();
        expect(rows[0].attempts).toBe(5);
        await expect(verifyAdminLogin(challenge.challengeToken, correctCode)).rejects.toThrow();
        expect(mocks.tx.userSession.create).not.toHaveBeenCalled();
    });
    it.each(['expired', 'password changed', 'email changed', 'demoted', 'suspended'])('rejects a challenge when %s', async reason => {
        const challenge = await start();
        if (reason === 'expired') rows[0].expires_at = new Date(0);
        if (reason === 'password changed') user.passwordHash = 'different';
        if (reason === 'email changed') user.emailNormalized = 'other@example.com';
        if (reason === 'demoted') user.role = 'CONTRIBUTOR';
        if (reason === 'suspended') user.status = 'SUSPENDED';
        await expect(verifyAdminLogin(challenge.challengeToken, emailCode)).rejects.toThrow();
        expect(mocks.tx.userSession.create).not.toHaveBeenCalled();
    });
    it('rejects unknown challenges, wrong passwords and non-admins on the admin route', async () => {
        await expect(verifyAdminLogin('x'.repeat(43), '123456')).rejects.toThrow();
        await expect(login(user.email, 'Wrong1')).rejects.toThrow();
        user.role = 'CONTRIBUTOR'; await expect(login(user.email, 'Correct1', true)).rejects.toThrow();
        expect(mocks.tx.job.create).not.toHaveBeenCalled();
    });
    it('cooldowns new codes and invalidates the previous challenge on resend', async () => {
        const first = await start(); await expect(start()).rejects.toThrow();
        rows[0].created_at = new Date(Date.now() - 61000);
        const second = await start();
        expect(second.challengeToken).not.toBe(first.challengeToken);
        await expect(verifyAdminLogin(first.challengeToken, emailCode)).rejects.toThrow();
        expect(rows[1].code_hash).toBe(tokenHash(second.challengeToken + ':' + emailCode));
    });
    it('binds action verification to its admin, session and purpose', async () => {
        const sid = randomUUID(); const challenge = await reauthenticate(user.id, sid, 'Correct1');
        await expect(verifyAdminLogin(challenge.challengeToken, emailCode)).rejects.toThrow();
        await expect(verifyAdminReauthentication(randomUUID(), sid, challenge.challengeToken, emailCode)).rejects.toThrow();
        await expect(verifyAdminReauthentication(user.id, randomUUID(), challenge.challengeToken, emailCode)).rejects.toThrow();
        const result = await verifyAdminReauthentication(user.id, sid, challenge.challengeToken, emailCode);
        expect((await verifyReauthentication(result.reauthToken)).sid).toBe(sid);
    });
    it('rejects pre-existing sessions after manual admin promotion until email login', async () => {
        const session = { id: randomUUID(), userId: user.id, user, familyId: randomUUID(), rotatedAt: null, revokedAt: null, expiresAt: new Date(Date.now() + 600000), adminEmailVerifiedAt: null };
        mocks.db.userSession.findUnique.mockResolvedValue(session);
        mocks.tx.userSession.findUnique.mockResolvedValue(session);
        await expect(authenticate(await signAccess(user, session.id))).rejects.toThrow();
        await expect(refresh('old-contributor-cookie')).rejects.toThrow();
        expect(mocks.tx.userSession.updateMany).toHaveBeenCalledWith({ where: { familyId: session.familyId }, data: { revokedAt: expect.any(Date) } });
        expect(mocks.tx.userSession.create).not.toHaveBeenCalled();
    });
});
