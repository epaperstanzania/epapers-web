import { it, expect } from 'vitest';
import { encrypt, decrypt } from '@epapers/server/lib/encryption';
it('encrypts outbox secrets with authentication and context binding', () => { const encrypted = encrypt({ text: 'otp-secret' }, 'email'); expect(encrypted).not.toContain('otp-secret'); expect(decrypt(encrypted, 'email')).toEqual({ text: 'otp-secret' }); expect(() => decrypt(encrypted, 'totp')).toThrow(); expect(() => decrypt(encrypted.slice(0, -8) + 'tampered', 'email')).toThrow(); });
