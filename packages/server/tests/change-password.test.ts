import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@epapers/database/client';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
    tx: { user: { findUnique: vi.fn(), update: vi.fn() }, userSession: { findFirst: vi.fn(), updateMany: vi.fn() }, $queryRaw: vi.fn(), $executeRaw: vi.fn() },
}));
vi.mock('@epapers/database', () => ({ db: {}, withTransactionRetry: async (action: (tx: unknown) => unknown) => action(mocks.tx) }));
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/auth/crypto', async original => ({ ...await original<object>(), verifyPassword: vi.fn(async (_hash: string, password: string) => password === 'Correct1') }));
import { changePassword } from '@epapers/server/modules/auth/service';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { verifyPassword } from '@epapers/auth/crypto';
import { POST } from '../../../apps/web/app/api/v1/auth/change-password/route';
import { clearSession } from '@/lib/routes-helpers';
let user: User;
beforeEach(() => {
    vi.clearAllMocks();
    user = { id: 'user-id', passwordHash: 'old-hash', status: 'ACTIVE', deletedAt: null, role: 'CONTRIBUTOR' } as User;
    mocks.tx.user.findUnique.mockImplementation(async () => user);
    mocks.tx.userSession.findFirst.mockResolvedValue({ id: 'session-id' });
});
describe('authenticated password changes', () => {
    it('rejects an invalid origin and missing authentication before touching credentials', async () => {
        for (const [origin, status] of [['https://invalid.example.com', 403], ['https://app.example.com', 401]] as const) {
            const response = await POST(new NextRequest('https://api.example.com/api/v1/auth/change-password', { method: 'POST', headers: { Origin: origin, 'X-EPapers-Client': 'web' }, body: JSON.stringify({ currentPassword: 'Correct1', password: 'FreshPass7' }) }));
            expect(response.status).toBe(status);
        }
        expect(mocks.tx.user.update).not.toHaveBeenCalled();
    });
    it('clears the refresh cookie while returning the password change notice', async () => {
        const response = clearSession('Password changed. Please sign in again.');
        expect(await response.json()).toEqual({ data: { message: 'Password changed. Please sign in again.' } });
        expect(response.headers.get('set-cookie')).toContain('epapers_refresh=;');
        expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    });
    it.each(['CONTRIBUTOR', 'LECTURER', 'ADMIN'] as const)('changes a %s password, revokes all sessions and consumes pending challenges', async role => {
        user.role = role;
        await expect(changePassword(user.id, 'session-id', 'Correct1', 'FreshPass7')).resolves.toEqual({ message: 'Password changed. Please sign in again.' });
        expect(verifyPassword).toHaveBeenCalledWith('old-hash', 'Correct1');
        expect(mocks.tx.user.update.mock.calls[0][0].data.passwordHash).toMatch(/^\$argon2id\$/);
        expect(mocks.tx.userSession.findFirst).toHaveBeenCalledWith({ where: { id: 'session-id', userId: user.id, revokedAt: null, expiresAt: { gt: expect.any(Date) } } });
        expect(mocks.tx.userSession.updateMany).toHaveBeenCalledWith({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
        const queries = mocks.tx.$executeRaw.mock.calls.map(call => call[0].join('?'));
        expect(queries.some(query => query.includes('UPDATE auth_challenges'))).toBe(true);
        expect(queries.some(query => query.includes('UPDATE admin_auth_challenges'))).toBe(true);
        expect(mocks.tx.$executeRaw.mock.calls.some(call => call.includes('PASSWORD_CHANGED'))).toBe(true);
    });
    it.each(['wrong password', 'same password', 'revoked session', 'suspended account'])('does not mutate credentials or sessions for %s', async reason => {
        if (reason === 'revoked session') mocks.tx.userSession.findFirst.mockResolvedValue(null);
        if (reason === 'suspended account') user.status = 'SUSPENDED';
        await expect(changePassword(user.id, 'session-id', reason === 'wrong password' ? 'Wrong1' : 'Correct1', reason === 'same password' ? 'Correct1' : 'FreshPass7')).rejects.toThrow();
        expect(mocks.tx.user.update).not.toHaveBeenCalled();
        expect(mocks.tx.userSession.updateMany).not.toHaveBeenCalled();
        expect(mocks.tx.$executeRaw).not.toHaveBeenCalled();
    });
    it('rejects weak new passwords while allowing legacy current passwords', async () => {
        expect(schemas.changePassword.safeParse({ currentPassword: 'old', password: 'FreshPass7' }).success).toBe(true);
        expect(schemas.changePassword.safeParse({ currentPassword: 'Correct1', password: 'user1@example.com' }).success).toBe(false);
        await expect(changePassword(user.id, 'session-id', 'Correct1', '123456')).rejects.toThrow('letter');
        expect(mocks.tx.user.update).not.toHaveBeenCalled();
    });
});
