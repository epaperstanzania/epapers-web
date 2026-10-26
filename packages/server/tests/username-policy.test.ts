import { describe, expect, it } from 'vitest';
import { nextUsernameChangeAt } from '@epapers/server/modules/auth/username-policy';
import { privateUser } from '@epapers/server/modules/auth/dto';
import type { User } from '@epapers/database/client';

describe('username change policy', () => {
    it('allows an initial change and unlocks exactly 24 hours after the previous change', () => {
        expect(nextUsernameChangeAt(null)).toBeNull();
        const changedAt = new Date('2026-10-25T10:30:00.000Z');
        const availableAt = nextUsernameChangeAt(changedAt)!;
        expect(availableAt.toISOString()).toBe('2026-10-26T10:30:00.000Z');
        expect(availableAt.getTime()).toBeGreaterThan(new Date('2026-10-26T10:29:59.999Z').getTime());
        expect(availableAt.getTime()).toBeLessThanOrEqual(new Date('2026-10-26T10:30:00.000Z').getTime());
    });

    it('includes the next change time in the private profile', () => {
        const user = { id: 'user', username: 'archivist', usernameChangedAt: new Date('2026-10-25T10:30:00.000Z'), email: 'user@example.com', fullName: 'Archivist', bio: '', avatarId: null, role: 'CONTRIBUTOR', emailVerifiedAt: null, lecturerVerifiedAt: null, homeDepartmentId: null, xp: 0n, joinedAt: new Date('2026-01-01T00:00:00.000Z') } as User;
        expect(privateUser(user).nextUsernameChangeAt).toBe('2026-10-26T10:30:00.000Z');
    });
});
