import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  image: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0]),
  size: 16,
  user: { id: '11111111-1111-4111-8111-111111111111', username: 'scholar', email: 'scholar@example.test', fullName: 'Scholar', bio: '', avatarId: null as string | null, role: 'CONTRIBUTOR', xp: 0, joinedAt: new Date(), emailVerifiedAt: new Date(), lecturerVerifiedAt: null, homeDepartmentId: null, deletedAt: null, status: 'ACTIVE' },
  copied: vi.fn(async () => undefined), deleted: vi.fn(async () => undefined), audited: vi.fn(async () => undefined),
}));

vi.mock('@epapers/server/lib/storage', () => ({ storage: {
  presignPut: vi.fn(async () => 'https://storage.example.test/signed'),
  head: vi.fn(async () => ({ size: fixture.size, type: 'image/png' })),
  range: vi.fn(async () => fixture.image),
  copy: fixture.copied,
  delete: fixture.deleted,
} }));
vi.mock('@epapers/database', () => ({
  db: { user: { findFirst: vi.fn(async () => ({ id: fixture.user.id })) } },
  withTransactionRetry: async (work: (tx: unknown) => Promise<unknown>) => work({
    $queryRaw: vi.fn(async () => []),
    user: { findUnique: vi.fn(async () => fixture.user), update: vi.fn(async ({ data }: { data: { avatarId: string } }) => ({ ...fixture.user, avatarId: data.avatarId })) },
    auditLog: { create: fixture.audited },
  }),
}));

import { presignProfileImage, completeProfileImage, MAX_PROFILE_IMAGE_BYTES } from '@epapers/server/modules/auth/avatar';

beforeEach(() => { fixture.copied.mockReset(); fixture.deleted.mockReset(); fixture.audited.mockReset(); fixture.image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0]); });

describe('profile image uploads', () => {
  it('rejects oversized or executable image formats before signing an upload', async () => {
    await expect(presignProfileImage(fixture.user.id, 'image/png', MAX_PROFILE_IMAGE_BYTES + 1)).rejects.toThrow();
    await expect(presignProfileImage(fixture.user.id, 'image/svg+xml', 100)).rejects.toThrow();
  });
  it('binds completion to the user and signed image, and records the change', async () => {
    const upload = await presignProfileImage(fixture.user.id, 'image/png', fixture.size);
    await expect(completeProfileImage('22222222-2222-4222-8222-222222222222', upload.token)).rejects.toThrow();
    await expect(completeProfileImage(fixture.user.id, upload.token.slice(0, -1) + (upload.token.endsWith('0') ? '1' : '0'))).rejects.toThrow();
    const result = await completeProfileImage(fixture.user.id, upload.token);
    expect(result.avatarId).toMatch(/^p_[a-f0-9]{30}$/);
    expect(fixture.copied).toHaveBeenCalledOnce();
    expect(fixture.audited).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: fixture.user.id, action: 'PROFILE_IMAGE_UPDATED' }) }));
  });
  it('rejects spoofed PNG bytes before publishing the image', async () => {
    const upload = await presignProfileImage(fixture.user.id, 'image/png', fixture.size);
    fixture.image = Buffer.from('<script>bad</script>');
    await expect(completeProfileImage(fixture.user.id, upload.token)).rejects.toThrow();
    expect(fixture.copied).not.toHaveBeenCalled();
    expect(fixture.deleted).toHaveBeenCalledOnce();
  });
});
