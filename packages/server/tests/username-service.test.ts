import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@epapers/database/client';

const fixture = vi.hoisted(() => {
    let user: Record<string, unknown>;
    const tx = {
        $queryRaw: vi.fn(async () => []),
        $executeRaw: vi.fn(async () => 1),
        user: {
            findUnique: vi.fn(async () => user),
            update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                user = { ...user, ...data };
                return user;
            }),
        },
    };
    return { tx, setUser: (value: Record<string, unknown>) => { user = value; } };
});

vi.mock('@epapers/database', () => ({
    db: {},
    withTransactionRetry: (operation: (tx: typeof fixture.tx) => Promise<unknown>) => operation(fixture.tx),
}));
vi.mock('@epapers/server/modules/auth/repository', () => ({ audit: vi.fn(async () => 1), challenge: vi.fn() }));
vi.mock('@epapers/server/modules/auth/avatar', () => ({ removeProfileImage: vi.fn() }));

import { updateProfile } from '@epapers/server/modules/auth/service';

afterEach(() => vi.useRealTimers());

describe('username updates', () => {
    it('allows one change in a rolling 24-hour window while allowing other profile edits', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-25T10:30:00.000Z'));
        fixture.setUser({ id: '00000000-0000-4000-8000-000000000001', username: 'first', usernameNormalized: 'first', usernameChangedAt: null, status: 'ACTIVE', deletedAt: null, email: 'user@example.com', fullName: 'Archivist', bio: '', avatarId: null, role: 'CONTRIBUTOR', emailVerifiedAt: null, lecturerVerifiedAt: null, homeDepartmentId: null, xp: 0, joinedAt: new Date('2026-01-01T00:00:00.000Z') } satisfies Partial<User>);

        const changed = await updateProfile('00000000-0000-4000-8000-000000000001', { username: 'second' });
        expect(changed.username).toBe('second');
        expect(changed.nextUsernameChangeAt).toBe('2026-10-26T10:30:00.000Z');
        await expect(updateProfile('00000000-0000-4000-8000-000000000001', { username: 'third' }))
            .rejects.toMatchObject({ status: 409, code: 'USERNAME_COOLDOWN' });
        expect((await updateProfile('00000000-0000-4000-8000-000000000001', { bio: 'New bio' })).bio).toBe('New bio');

        vi.setSystemTime(new Date('2026-10-26T10:30:00.000Z'));
        expect((await updateProfile('00000000-0000-4000-8000-000000000001', { username: 'third' })).username).toBe('third');
    });
});
