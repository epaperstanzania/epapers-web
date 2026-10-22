import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { User } from '@epapers/database/client';
import { authenticate, authorize } from '@epapers/server/modules/auth/service';
import { route } from '@epapers/server/modules/auth/routes-helpers';
import { signReauthentication } from '@epapers/auth/jwt';
import { adminSchemas } from '@epapers/server/modules/admin/schemas';
import { adminUser } from '@epapers/server/modules/admin/dto';
import { empty } from '@epapers/server/modules/catalog/schemas';
import { parseCsv } from '@epapers/server/modules/admin/structure';
import { scrub } from '@epapers/server/lib/logger';
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/server/lib/write-policy', () => ({ enforceWritePolicy: vi.fn() }));
vi.mock('@epapers/server/modules/auth/service', async (importOriginal) => ({ ...await importOriginal<typeof import('@epapers/server/modules/auth/service')>(), authenticate: vi.fn() }));
const user = (role: User['role']) => ({ id: crypto.randomUUID(), role, status: 'ACTIVE', deletedAt: null, emailVerifiedAt: new Date(), username: 'fixture', fullName: 'Private', email: 'fixture@example.com', passwordHash: 'private-hash', totpSecret: 'private-secret', xp: 10, allTimeXp: 10, homeDepartmentId: null, lecturerVerifiedAt: null, joinedAt: new Date() }) as User;
const req = (method = 'GET', token = true, reauth?: string) => new NextRequest('https://api.example.com/api/v1/admin/test', { method, headers: { Origin: 'https://app.example.com', 'X-EPapers-Client': 'web', ...(token ? { Authorization: 'Bearer fixture' } : {}), ...(reauth ? { 'X-EPapers-Reauth': reauth } : {}) }, ...(method === 'GET' ? {} : { body: '{}' }) });
beforeEach(() => vi.clearAllMocks());
describe('authorization matrix', () => {
    for (const role of ['CONTRIBUTOR', 'LECTURER', 'ADMIN'] as const)
        it(`admin routes enforce the ${role} role before actions`, async () => {
            const u = user(role), action = vi.fn().mockResolvedValue({ message: 'ok' });
            vi.mocked(authenticate).mockResolvedValue({ user: u, session: { id: 'session' } } as Awaited<ReturnType<typeof authenticate>>);
            const response = await route('admin/test', empty, action, { roles: ['admin'] })(req());
            expect(response.status).toBe(role === 'ADMIN' ? 200 : 403);
            expect(action).toHaveBeenCalledTimes(role === 'ADMIN' ? 1 : 0);
            expect(response.headers.get('cache-control')).toBe('no-store');
        });
    it('blocks guests before an admin action', async () => { const action = vi.fn(); expect((await route('admin/test', empty, action, { roles: ['admin'] })(req('GET', false))).status).toBe(401); expect(action).not.toHaveBeenCalled(); });
    for (const status of ['SUSPENDED', 'BANNED'] as const)
        it(`rejects ${status} service identities`, () => expect(() => authorize({ ...user('ADMIN'), status }, { roles: ['admin'] })).toThrow());
    it('rejects deleted identities even with an admin role', () => expect(() => authorize({ ...user('ADMIN'), deletedAt: new Date() }, { roles: ['admin'] })).toThrow());
    it('binds sensitive writes to the active administrator session', async () => {
        const u = user('ADMIN'), sid = crypto.randomUUID(), action = vi.fn().mockResolvedValue({ message: 'ok' });
        vi.mocked(authenticate).mockResolvedValue({ user: u, session: { id: sid } } as Awaited<ReturnType<typeof authenticate>>);
        const handler = route('admin/test', empty, action, { roles: ['admin'], requireReauth: true });
        expect((await handler(req('POST'))).status).toBe(401);
        expect((await handler(req('POST', true, await signReauthentication(u.id, crypto.randomUUID())))).status).toBe(401);
        expect((await handler(req('POST', true, await signReauthentication(u.id, sid)))).status).toBe(200);
        expect(action).toHaveBeenCalledTimes(1);
    });
    it('rejects duplicated query keys before a service call', async () => { const action = vi.fn(); expect((await route('public', empty, action)(new NextRequest('https://api.example.com?limit=1&limit=2'))).status).toBe(422); expect(action).not.toHaveBeenCalled(); });
});
describe('administrative input and privacy boundaries', () => {
    it('allows positive idempotent grants and rejects deduction fields', () => {
        expect(adminSchemas.user.safeParse({ grantXp: { amount: 1, requestId: crypto.randomUUID() }, reason: 'Award' }).success).toBe(true);
        for (const amount of [0, -1])
            expect(adminSchemas.user.safeParse({ grantXp: { amount, requestId: crypto.randomUUID() }, reason: 'Award' }).success).toBe(false);
        expect(adminSchemas.user.safeParse({ xp: -50, reason: 'Deduct' }).success).toBe(false);
        expect(adminSchemas.settings.safeParse({ JWT_SECRET: 'injection', reason: 'test' }).success).toBe(false);
    });
    it('requires a concrete patch and preserves absent patch fields', () => {
        expect(adminSchemas.modulePatch.safeParse({ reason: 'No change' }).success).toBe(false);
        expect(adminSchemas.modulePatch.parse({ name: 'Renamed', reason: 'test' })).toEqual({ name: 'Renamed', reason: 'test' });
    });
    it('handles escaped CSV cells and rejects oversized batches or broken quotes', () => {
        const header = 'code,name,programCode,semester,levelYear,credits\n';
        expect(parseCsv(header + 'AB,"Quoted ""name"", advanced",BC,1,,4')[0][1]).toBe('Quoted "name", advanced');
        expect(() => parseCsv(header + 'AB,"unclosed,BC,1,,4')).toThrow();
        expect(() => parseCsv(header + Array(51).fill('AB,Name,BC,1,,4').join('\n'))).toThrow();
    });
    it('admin DTOs expose authorized identity fields but never credentials', () => { const dto = adminUser(user('ADMIN')); for (const field of ['passwordHash', 'totpSecret', 'refreshTokenHash'])
        expect(dto).not.toHaveProperty(field); expect(dto.email).toBe('fixture@example.com'); });
    it('scrubs nested signed URLs, database credentials, email and payloads', () => {
        const result = JSON.stringify(scrub({ safeId: 'uuid', nested: { DATABASE_URL: 'postgresql://secret', signedUrl: 'https://signed-secret', email: 'private-email', payload: { otp: '654321' }, totpSecret: 'totp-secret' }, error: new Error('SQL secret') }));
        for (const value of ['postgresql://secret', 'https://signed-secret', 'private-email', '654321', 'totp-secret', 'SQL secret'])
            expect(result).not.toContain(value);
        expect(result).toContain('[REDACTED]');
        expect(result).toContain('uuid');
    });
});
