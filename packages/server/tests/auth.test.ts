import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { signAccess, verifyAccess, signReauthentication, verifyReauthentication } from '@epapers/auth/jwt';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { tokenHash, hashPassword, verifyPassword, verifyTotp } from '@epapers/auth/crypto';
import { privateUser } from '@epapers/server/modules/auth/dto';
import { route, sessionResponse, preflight } from '@/lib/routes-helpers';
import type { User } from '@epapers/database/client';
import { passwordError } from '@epapers/config/password-policy';
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
describe('authentication security', () => {
    it('explains invalid passwords and rejects email addresses and common passwords', async () => {
        const cases = [['user123@example.com', 'email address'], ['abc12', 'at least 6'], ['abcdef', 'number'], ['123456', 'letter'], ['password123', 'common and weak'], ['A'.repeat(129) + '1', '128']];
        for (const [value, reason] of cases) {
            expect(passwordError(value)).toContain(reason);
            await expect(hashPassword(value)).rejects.toThrow(reason);
            const result = schemas.register.safeParse({ username: 'fixture', email: 'test@example.com', fullName: 'Test User', password: value });
            expect(result.success).toBe(false);
            expect(schemas.reset.safeParse({ token: 'x'.repeat(40), password: value }).success).toBe(false);
        }
        expect(passwordError('Curator7')).toBeNull();
    });
    it('returns the password rejection reason to the client without exposing the password', async () => {
        const action = vi.fn();
        const handler = route('auth/register', schemas.register, action);
        const response = await handler(new NextRequest('https://api.example.com/api/v1/auth/register', { method: 'POST', headers: { Origin: 'https://app.example.com', 'X-EPapers-Client': 'web' }, body: JSON.stringify({ username: 'fixture', email: 'test@example.com', fullName: 'Test User', password: 'user123@example.com' }) }));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.error.fields).toContainEqual({ path: 'password', message: 'An email address cannot be used as a password. Choose a different password.' });
        expect(JSON.stringify(body)).not.toContain('user123@example.com');
        expect(action).not.toHaveBeenCalled();
    });
    it('requires six characters with a letter and number, with optional case and symbols', () => {
        for (const value of ['abcdef', '123456', 'abc12', 'ABCDEF']) expect(schemas.register.safeParse({ username: 'fixture', email: 'test@example.com', fullName: 'Test User', password: value }).success).toBe(false);
        for (const value of ['abc123', 'ABC123', 'Abc123', 'abc12!']) expect(schemas.register.safeParse({ username: 'fixture', email: 'test@example.com', fullName: 'Test User', password: value }).success).toBe(true);
        expect(schemas.adminLogin.safeParse({ usernameOrEmail: 'admin', password: 'abc123', totp: '123456' }).success).toBe(false);
    });
    it('issues minimal signed claims and validates issuer/audience', async () => { const token = await signAccess({ id: 'user', role: 'CONTRIBUTOR' }, 'session'); const claims = await verifyAccess(token); expect(claims).toMatchObject({ sub: 'user', role: 'contributor', sid: 'session' }); expect(claims.exp! - claims.iat!).toBe(900); expect(claims).not.toHaveProperty('email'); });
    it('rejects wrong audience and expired JWTs', async () => { const key = new TextEncoder().encode('a'.repeat(32)); for (const data of [{ aud: 'other', exp: '15m' }, { aud: 'epapers-spa', exp: '-1s' }]) {
        const token = await new SignJWT({ role: 'contributor', sid: 'session' }).setProtectedHeader({ alg: 'HS256' }).setSubject('user').setIssuer('epapers-api').setAudience(data.aud).setIssuedAt().setJti('jti').setExpirationTime(data.exp).sign(key);
        await expect(verifyAccess(token)).rejects.toThrow();
    } });
    it('separates admin reauthentication and access JWT audiences', async () => { const reauth = await signReauthentication('admin', 'session'); expect((await verifyReauthentication(reauth)).purpose).toBe('reauth'); await expect(verifyAccess(reauth)).rejects.toThrow(); const access = await signAccess({ id: 'admin', role: 'ADMIN' }, 'session'); await expect(verifyReauthentication(access)).rejects.toThrow(); });
    it('rejects altered tokens', async () => { const token = await signAccess({ id: 'user', role: 'CONTRIBUTOR' }, 'session'); await expect(verifyAccess(token.slice(0, -5) + 'xxxxx')).rejects.toThrow(); });
    it('rejects admin registration, unknown fields, and avatar URLs', () => { const input = { username: 'test_user', email: 'test@example.com', password: 'a-strong-passphrase1', fullName: 'Test User' }; expect(schemas.register.safeParse({ ...input, role: 'lecturer' }).success).toBe(false); expect(schemas.register.safeParse(input).success).toBe(true); expect(schemas.register.safeParse({ ...input, role: 'admin' }).success).toBe(false); expect(schemas.register.safeParse({ ...input, xp: 100 }).success).toBe(false); expect(schemas.profile.safeParse({ avatarId: 'https://example.com/a.png' }).success).toBe(false); });
    it('verifies TOTP against the RFC 6238 test vector', () => { vi.useFakeTimers(); try {
        vi.setSystemTime(new Date(59000));
        expect(verifyTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082')).toBe(true);
        expect(verifyTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '111111')).toBe(false);
    }
    finally {
        vi.useRealTimers();
    } });
    it('uses salted token hashes and Argon2id', async () => { expect(tokenHash('secret')).not.toContain('secret'); const hash = await hashPassword('A long unique test password1'); expect(hash).toContain('$argon2id$'); expect(await verifyPassword(hash, 'wrong')).toBe(false); expect(await verifyPassword(hash, 'A long unique test password1')).toBe(true); await expect(hashPassword('password123')).rejects.toThrow(); });
    it('private DTO never exposes XP or credentials', () => { const dto = privateUser({ id: 'id', username: 'user', email: 'user@example.com', fullName: 'Private', bio: '', avatarId: null, role: 'CONTRIBUTOR', emailVerifiedAt: null, xp: 999, passwordHash: 'secret', joinedAt: new Date() } as User); expect(dto.levelTitle).toBe('Senior Curator'); for (const key of ['xp', 'allTimeXp', 'passwordHash', 'totpSecret', 'status'])
        expect(dto).not.toHaveProperty(key); });
    it('rejects missing origin and client header before invoking service', async () => { const action = vi.fn(); const handler = route('test', schemas.empty, action); const response = await handler(new NextRequest('https://api.example.com/api/v1/test', { method: 'POST', body: '{}' })); expect(response.status).toBe(403); expect(action).not.toHaveBeenCalled(); expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff'); });
    it('enforces strict schema and body limits on route handlers', async () => { const action = vi.fn(); const handler = route('test', schemas.empty, action); for (const [body, status] of [['{"unknown":1}', 422], ['x'.repeat(17000), 413]] as const) {
        const req = new NextRequest('https://api.example.com/api/v1/test', { method: 'POST', headers: { Origin: 'https://app.example.com', 'X-EPapers-Client': 'web' }, body });
        expect((await handler(req)).status).toBe(status);
    } expect(action).not.toHaveBeenCalled(); });
    it('sets scoped secure HttpOnly refresh cookies', () => { const response = sessionResponse({ refreshToken: 'secret', accessToken: 'jwt', user: { id: 'id' }, session: { expiresAt: new Date(Date.now() + 60000) } }); const cookie = response.headers.get('set-cookie')!; for (const part of ['HttpOnly', 'Secure', 'SameSite=lax', 'Path=/api/v1/auth', 'Domain=example.com'])
        expect(cookie).toContain(part); });
    it('only permits CORS from the configured origin', () => { const good = preflight(new NextRequest('https://api.example.com', { method: 'OPTIONS', headers: { origin: 'https://app.example.com' } })); expect(good.status).toBe(204); const bad = preflight(new NextRequest('https://api.example.com', { method: 'OPTIONS', headers: { origin: 'https://evil.example.com' } })); expect(bad.status).toBe(403); expect(bad.headers.has('access-control-allow-origin')).toBe(false); });
});
