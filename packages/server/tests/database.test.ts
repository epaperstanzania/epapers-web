import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@epapers/database/client';
import { verifyReauthentication } from '@epapers/auth/jwt';
import { NextRequest } from 'next/server';
import { POST as registerRoute } from '../../../apps/web/app/api/v1/auth/register/route';
import { decrypt } from '@epapers/server/lib/encryption';
import { randomUUID } from 'node:crypto';
import { hashPassword, tokenHash } from '@epapers/auth/crypto';
import { login as beginLogin, verifyAdminLogin, verifyAdminReauthentication, refresh, authenticate, verifyOtp, resetPassword, updateProfile, reauthenticate } from '@epapers/server/modules/auth/service';
async function login(username: string, password: string) { const result = await beginLogin(username, password); if ('verificationRequired' in result) throw new Error('Unexpected admin challenge'); return result; }
const jobs: string[] = [];
const enabled = process.env.EPAPERS_DB_TESTS_ENABLED === 'true';
const db = new PrismaClient();
const created: string[] = [];
async function user() { const suffix = randomUUID().replaceAll('-', '').slice(0, 12); const u = await db.user.create({ data: { username: 'test_' + suffix, usernameNormalized: 'test_' + suffix, email: suffix + '@example.com', emailNormalized: suffix + '@example.com', fullName: 'Test User', passwordHash: await hashPassword('Unique test password for EPapers 1') } }); created.push(u.id); await db.$executeRaw `INSERT INTO username_registry(username_normalized,user_id) VALUES (${u.usernameNormalized},${u.id}::UUID)`; return u; }
afterAll(async () => { if (enabled) {
    await db.job.deleteMany({ where: { id: { in: jobs } } });
} if (enabled)
    for (const id of created) {
        await db.$executeRaw `DELETE FROM audit_logs WHERE actor_user_id=${id}::UUID`;
        await db.$executeRaw `DELETE FROM auth_challenges WHERE user_id=${id}::UUID`;
        await db.$executeRaw `DELETE FROM username_registry WHERE user_id=${id}::UUID`;
        await db.userSession.deleteMany({ where: { userId: id } });
        await db.user.delete({ where: { id } });
    } await db.$disconnect(); });
describe.skipIf(!enabled)('real CockroachDB foundation and auth', () => {
    it('runs on CockroachDB and enforces positive XP', async () => { const version = await db.$queryRaw<Array<{
        version: string;
    }>> `SELECT version()`; expect(version[0].version).toContain('CockroachDB'); const u = await user(); await expect(db.$executeRaw `INSERT INTO xp_ledger(user_id,amount,event_type) VALUES (${u.id}::UUID,-1,'ADMIN_ADJUSTMENT')`).rejects.toThrow(); });
    it('registers via handler, queues encrypted OTP, verifies email, and prevents role escalation', async () => {
        const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
        const email = suffix + '@example.com';
        const started = new Date();
        const response = await registerRoute(new NextRequest('https://api.example.com/api/v1/auth/register', { method: 'POST', headers: { Origin: 'https://app.example.com', 'X-EPapers-Client': 'web', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'signup_' + suffix, email, fullName: 'Registration Fixture', password: 'Unique test password for EPapers 1' }) }));
        expect(response.status).toBe(200);
        const u = await db.user.findUniqueOrThrow({ where: { emailNormalized: email } });
        created.push(u.id);
        expect(u.role).toBe('CONTRIBUTOR');
        expect(u.lecturerVerifiedAt).toBeNull();
        const queued = await db.job.findMany({ where: { createdAt: { gte: started }, type: 'email_otp' } });
        const job = queued.find(j => decrypt<{
            to: string;
        }>(String((j.payload as {
            encrypted: string;
        }).encrypted), 'email').to === email)!;
        expect(job).toBeDefined();
        jobs.push(job.id);
        expect(JSON.stringify(job.payload)).not.toContain(email);
        const message = decrypt<{
            text: string;
        }>(String((job.payload as {
            encrypted: string;
        }).encrypted), 'email');
        const code = message.text.match(/\d{6}/)![0];
        await verifyOtp(email, code);
        expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifiedAt).not.toBeNull();
    });
    it('rejects suspended accounts even with a previously issued access token', async () => { const u = await user(); const issued = await login(u.email, 'Unique test password for EPapers 1'); await db.user.update({ where: { id: u.id }, data: { status: 'SUSPENDED' } }); await expect(authenticate(issued.accessToken)).rejects.toThrow(); await expect(refresh(issued.refreshToken)).rejects.toThrow(); expect((await db.userSession.findUniqueOrThrow({ where: { id: issued.session.id } })).revokedAt).not.toBeNull(); });
    it('requires a single-use email code for admin login and reauthentication', async () => {
        const u = await user(); await db.user.update({ where: { id: u.id }, data: { role: 'ADMIN' } });
        const readCode = async () => {
            const queued = await db.job.findMany({ where: { type: 'email_otp' }, orderBy: { createdAt: 'desc' } });
            const job = queued.find(j => decrypt<{ to: string }>(String((j.payload as { encrypted: string }).encrypted), 'email').to === u.email)!;
            jobs.push(job.id);
            return decrypt<{ text: string }>(String((job.payload as { encrypted: string }).encrypted), 'email').text.match(/code is (\d{6})/)![1];
        };
        const challenge = await beginLogin(u.email, 'Unique test password for EPapers 1');
        if (!('verificationRequired' in challenge)) throw new Error('Admin session issued too early');
        expect(await db.userSession.count({ where: { userId: u.id } })).toBe(0);
        const code = await readCode();
        const issued = await verifyAdminLogin(challenge.challengeToken, code);
        expect(issued.user.role).toBe('admin');
        await expect(verifyAdminLogin(challenge.challengeToken, code)).rejects.toThrow();
        const proof = await reauthenticate(u.id, issued.session.id, 'Unique test password for EPapers 1');
        const reauth = await verifyAdminReauthentication(u.id, issued.session.id, proof.challengeToken, await readCode());
        expect((await verifyReauthentication(reauth.reauthToken)).sub).toBe(u.id);
    });
    it('rotates refresh tokens and commits family revocation on reuse', async () => { const u = await user(); const first = await login(u.username, 'Unique test password for EPapers 1'); expect(first.session).not.toHaveProperty('refreshTokenHash'); const second = await refresh(first.refreshToken); expect(second.session).not.toHaveProperty('refreshTokenHash'); expect(second.refreshToken).not.toBe(first.refreshToken); await expect(authenticate(first.accessToken)).rejects.toThrow(); await expect(refresh(first.refreshToken)).rejects.toThrow(); await expect(authenticate(second.accessToken)).rejects.toThrow(); });
    it('commits failed OTP attempts and accepts a code only once', async () => { const u = await user(); await db.$executeRaw `INSERT INTO auth_challenges(user_id,kind,token_hash,expires_at) VALUES (${u.id}::UUID,'otp',${tokenHash('123456')},${new Date(Date.now() + 600000)})`; await expect(verifyOtp(u.email, '000000')).rejects.toThrow(); const c = await db.$queryRaw<Array<{
        attempts: number;
    }>> `SELECT attempts FROM auth_challenges WHERE user_id=${u.id}::UUID`; expect(Number(c[0].attempts)).toBe(1); await verifyOtp(u.email, '123456'); await expect(verifyOtp(u.email, '123456')).rejects.toThrow(); });
    it('reserves historical usernames and applies cooldown', async () => { const u = await user(); const newName = 'new_' + randomUUID().replaceAll('-', '').slice(0, 12); await updateProfile(u.id, { username: newName }); const registry = await db.$queryRaw<Array<{
        is_current: boolean;
    }>> `SELECT is_current FROM username_registry WHERE username_normalized=${u.usernameNormalized}`; expect(registry[0].is_current).toBe(false); await expect(updateProfile(u.id, { username: 'another_' + randomUUID().slice(0, 8) })).rejects.toThrow(); });
    it('consumes password reset once and revokes sessions', async () => { const u = await user(); const session = await login(u.email, 'Unique test password for EPapers 1'); const token = randomUUID() + randomUUID(); await db.$executeRaw `INSERT INTO auth_challenges(user_id,kind,token_hash,expires_at) VALUES (${u.id}::UUID,'reset',${tokenHash(token)},${new Date(Date.now() + 1800000)})`; await resetPassword(token, 'Different unique test password 2'); await expect(resetPassword(token, 'Another unique test password 3')).rejects.toThrow(); await expect(authenticate(session.accessToken)).rejects.toThrow(); });
});
