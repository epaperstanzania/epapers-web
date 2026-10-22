import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { portalOrigins } from '@epapers/config/portals';
import { tokenHash } from '@epapers/auth/crypto';
import { createPortalGrant, exchangePortalGrant } from '@epapers/server/modules/auth/service';
const mocks = vi.hoisted(() => ({ sessions: new Map<string, Record<string, unknown>>(), user: { id: 'user', role: 'CONTRIBUTOR', status: 'ACTIVE', deletedAt: null, username: 'fixture', email: 'fixture@example.test', fullName: 'Fixture', bio: '', avatarId: null, xp: 0, joinedAt: new Date(), emailVerifiedAt: new Date() } }));
vi.mock('@epapers/database', () => {
  const tx = {
    $queryRaw: vi.fn(async () => []),
    user: { findUnique: vi.fn(async () => mocks.user) },
    userSession: {
      findFirst: vi.fn(async ({ where }) => { const row = mocks.sessions.get(where.id); return row && !row.revokedAt && !row.rotatedAt && (row.expiresAt as Date) > new Date() ? row : null; }),
      findUnique: vi.fn(async ({ where }) => where.id ? mocks.sessions.get(where.id) : [...mocks.sessions.values()].find(row => row.refreshTokenHash === where.refreshTokenHash)),
      create: vi.fn(async ({ data }) => { const row = { id: crypto.randomUUID(), revokedAt: null, rotatedAt: null, ...data }; mocks.sessions.set(row.id, row); return { ...row }; }),
      update: vi.fn(async ({ where, data }) => { const row = mocks.sessions.get(where.id)!; Object.assign(row, data); return { ...row }; }),
    },
  };
  return { db: tx, withTransactionRetry: (fn: (tx: unknown) => unknown) => fn(tx) };
});
const verifier = 'v'.repeat(43), challenge = createHash('sha256').update(verifier).digest('base64url');
const redirectUri = portalOrigins.contributor + '/auth/callback';
const expiry = new Date(Date.now() + 3600000);
beforeEach(() => { mocks.sessions.clear(); mocks.user.role = 'CONTRIBUTOR'; mocks.sessions.set('parent', { id: 'parent', userId: 'user', familyId: 'family', expiresAt: expiry, revokedAt: null, rotatedAt: null, adminEmailVerifiedAt: null }); });
const issue = () => createPortalGrant('user', 'parent', { redirectUri, challenge });
const exchange = (code: string, overrides = {}) => exchangePortalGrant({ code, verifier, redirectUri, ...overrides }, portalOrigins.contributor);
describe('portal authorization codes', () => {
  it('creates a single-use session in the original family without extending its expiry', async () => {
    const { code } = await issue();
    const result = await exchange(code);
    const session = [...mocks.sessions.values()].find(row => row.refreshTokenHash === tokenHash(result.refreshToken));
    expect(session?.familyId).toBe('family');
    expect(result.session.expiresAt).toEqual(expiry);
    await expect(exchange(code)).rejects.toThrow('invalid or expired');
  });
  it('rejects untrusted callbacks before creating a session', async () => {
    await expect(createPortalGrant('user', 'parent', { challenge, redirectUri: 'https://evil.test/auth/callback' })).rejects.toThrow('Unknown portal callback');
    expect(mocks.sessions.size).toBe(1);
  });
  it('binds codes to PKCE, callback and origin', async () => {
    const { code } = await issue();
    await expect(exchange(code, { verifier: 'x'.repeat(43) })).rejects.toThrow('invalid or expired');
    await expect(exchange(code, { redirectUri: portalOrigins.admin + '/auth/callback' })).rejects.toThrow('invalid or expired');
    await expect(exchangePortalGrant({ code, verifier, redirectUri }, 'https://evil.test')).rejects.toThrow('invalid or expired');
    expect((await exchange(code)).accessToken).toBeTruthy();
  });
  it('rejects tampered, expired and revoked grants', async () => {
    const { code } = await issue();
    await expect(exchange(code.slice(0, -20) + 'tampered')).rejects.toThrow('invalid or expired');
    const pending = [...mocks.sessions.values()].find(row => row.id !== 'parent')!;
    pending.revokedAt = new Date();
    await expect(exchange(code)).rejects.toThrow('invalid or expired');
    pending.revokedAt = null;
    vi.useFakeTimers();
    try { vi.setSystemTime(Date.now() + 121000); await expect(exchange(code)).rejects.toThrow('invalid or expired'); }
    finally { vi.useRealTimers(); }
  });
  it('cannot upgrade a contributor grant to an admin session', async () => {
    const { code } = await issue(); mocks.user.role = 'ADMIN';
    await expect(exchange(code)).rejects.toThrow('invalid or expired');
    await expect(issue()).rejects.toThrow('sign in again');
  });
});
