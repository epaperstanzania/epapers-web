import { describe, it, expect } from 'vitest';
import { withRetry } from '@epapers/database/retry';
import { env } from '@epapers/config/server-env';
import { createLogger } from '@epapers/server/lib/logger';
describe('foundation', () => {
    it('retries Prisma serializable conflicts', async () => { let calls = 0; expect(await withRetry(async () => { if (++calls < 3)
        throw { code: 'P2034' }; return 7; })).toBe(7); expect(calls).toBe(3); });
    it('does not retry other errors', async () => { let calls = 0; await expect(withRetry(async () => { calls++; throw new Error('no'); })).rejects.toThrow('no'); expect(calls).toBe(1); });
    it('never prints encryption or IP salt from environment objects', () => { let output = ''; const log = createLogger({ write(s) { output += s; } }); log.info({ env }); expect(output).not.toContain(env.DATA_ENCRYPTION_KEY); expect(output).not.toContain(env.IP_HASH_SALT); });
    it('redacts nested secrets including error messages', () => { let output = ''; const log = createLogger({ write(s) { output += s; } }); log.info({ nested: { password: 'fake-password', email: 'fake-email', token: 'fake-token' }, err: new Error('fake-secret') }, 'safe'); for (const secret of ['fake-password', 'fake-email', 'fake-token', 'fake-secret'])
        expect(output).not.toContain(secret); expect(output).toContain('[REDACTED]'); });
});
