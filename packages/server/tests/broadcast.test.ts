import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { User } from '@epapers/database/client';
const mocks = vi.hoisted(() => ({ tx: {
    user: { findMany: vi.fn() }, announcement: { findUnique: vi.fn(), create: vi.fn() },
    job: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() }, notification: { create: vi.fn() },
    $queryRaw: vi.fn(), $executeRaw: vi.fn(),
} }));
vi.mock('@epapers/database', () => ({ db: {}, withTransactionRetry: async (fn: (tx: unknown) => unknown) => fn(mocks.tx), withRetry: async (fn: () => unknown) => fn(), withDeleted: vi.fn() }));
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/server/modules/admin/guard', () => ({ adminGuard: vi.fn(), audit: vi.fn(), requireProof: vi.fn(), rawAdminGuard: vi.fn() }));
import { deliverBroadcast, reserveBroadcastSlot, BROADCAST_BATCH_SIZE } from '@epapers/server/jobs/broadcast';
import { reserveDailyEmail } from '@epapers/server/jobs/email-limits';
import { saveAnnouncement } from '@epapers/server/modules/admin/service';
import { adminSchemas } from '@epapers/server/modules/admin/schemas';
import { broadcastEmail } from '@epapers/server/lib/email/templates';
import { decrypt } from '@epapers/server/lib/encryption';
let announcement: { id: string; title: string; content: string; isActive: boolean; startsAt: Date; endsAt: Date | null; createdAt: Date; deletedAt: Date | null; type: string };
let jobs: Map<string, { payload: unknown }>;
let counters: Map<string, Date>;
beforeEach(() => {
    vi.clearAllMocks(); jobs = new Map(); counters = new Map();
    announcement = { id: randomUUID(), title: 'Campus notice', content: '<script>unsafe</script>', isActive: true, startsAt: new Date(0), endsAt: null, createdAt: new Date(), deletedAt: null, type: 'info' };
    mocks.tx.announcement.findUnique.mockImplementation(async () => announcement);
    mocks.tx.announcement.create.mockResolvedValue(announcement);
    mocks.tx.user.findMany.mockResolvedValue([]);
    mocks.tx.job.findUnique.mockImplementation(async ({ where }) => jobs.get(where.dedupeKey));
    mocks.tx.job.create.mockImplementation(async ({ data }) => { jobs.set(data.dedupeKey, data); return data; });
    mocks.tx.job.upsert.mockImplementation(async ({ where, create }) => { if (!jobs.has(where.dedupeKey)) jobs.set(where.dedupeKey, create); return jobs.get(where.dedupeKey); });
    mocks.tx.$queryRaw.mockImplementation(async (_query, key) => counters.has(key) ? [{ expires_at: counters.get(key) }] : []);
    mocks.tx.$executeRaw.mockImplementation(async (_query, key, seconds) => { counters.set(key, new Date(Date.now() + seconds * 1000)); return 1; });
});
describe('broadcast delivery', () => {
    it('creates one portal notification per recipient and emails only verified contributors, even on replay', async () => {
        const users = [
            { id: randomUUID(), role: 'CONTRIBUTOR', email: 'verified@example.com', emailVerifiedAt: new Date() },
            { id: randomUUID(), role: 'CONTRIBUTOR', email: 'unverified@example.com', emailVerifiedAt: null },
            { id: randomUUID(), role: 'LECTURER', email: 'faculty@example.com', emailVerifiedAt: new Date() },
        ];
        mocks.tx.user.findMany.mockResolvedValue(users);
        await deliverBroadcast(announcement.id, true);
        await deliverBroadcast(announcement.id, true);
        expect(mocks.tx.notification.create).toHaveBeenCalledTimes(3);
        const emails = [...jobs.values()].filter(job => (job as { type?: string }).type === 'email_broadcast');
        expect(emails).toHaveLength(1);
        const payload = emails[0].payload as { encrypted: string };
        expect(JSON.stringify(payload)).not.toContain('verified@example.com');
        expect(decrypt<{ to: string }>(payload.encrypted, 'email').to).toBe('verified@example.com');
        expect(mocks.tx.user.findMany.mock.calls[0][0].where).toMatchObject({ status: 'ACTIVE', deletedAt: null, joinedAt: { lte: announcement.createdAt } });
    });
    it('keeps email opt-in and queues bounded continuation batches', async () => {
        const users = Array.from({ length: BROADCAST_BATCH_SIZE }, () => ({ id: randomUUID(), role: 'CONTRIBUTOR', email: 'verified@example.com', emailVerifiedAt: new Date() }));
        mocks.tx.user.findMany.mockResolvedValue(users);
        await deliverBroadcast(announcement.id, false);
        expect([...jobs.keys()].filter(key => key.startsWith('broadcast_email:'))).toHaveLength(0);
        expect(jobs.get(`broadcast_batch:${announcement.id}:${users.at(-1)!.id}`)?.payload).toMatchObject({ cursor: users.at(-1)!.id, sendEmail: false });
    });
    it.each(['inactive', 'deleted', 'expired', 'future'])('does not deliver a %s announcement', async reason => {
        if (reason === 'inactive') announcement.isActive = false;
        if (reason === 'deleted') announcement.deletedAt = new Date();
        if (reason === 'expired') announcement.endsAt = new Date(0);
        if (reason === 'future') announcement.startsAt = new Date(Date.now() + 3600000);
        const result = await deliverBroadcast(announcement.id, true);
        if (reason === 'future') expect(result).toEqual(announcement.startsAt);
        expect(mocks.tx.notification.create).not.toHaveBeenCalled();
    });
    it('paces sending across workers and limits each recipient to one broadcast per hour', async () => {
        expect(await reserveBroadcastSlot('first')).toBeNull();
        expect(await reserveBroadcastSlot('second')).toBeInstanceOf(Date);
        counters.set('broadcast_email:global', new Date(0));
        expect(await reserveBroadcastSlot('first')).toBeInstanceOf(Date);
        expect(await reserveBroadcastSlot('second')).toBeNull();
    });
    it('does not increment an exhausted daily budget', async () => {
        mocks.tx.$queryRaw.mockResolvedValue([]);
        expect(await reserveDailyEmail(360)).toBe(false);
        expect(mocks.tx.$queryRaw.mock.calls[0][0].join('?')).toContain('WHERE email_daily_counters.sent <');
        mocks.tx.$queryRaw.mockResolvedValue([{ sent: 1n }]);
        expect(await reserveDailyEmail(450)).toBe(true);
    });
    it('returns the original announcement for a repeated request ID and rejects changed content', async () => {
        const admin = { id: randomUUID(), role: 'ADMIN', status: 'ACTIVE', deletedAt: null } as User;
        const input = adminSchemas.announcement.parse({ title: announcement.title, content: announcement.content, startsAt: new Date(0).toISOString(), reason: 'Test broadcast', requestId: randomUUID(), sendEmail: true });
        expect(await saveAnnouncement(admin, input)).toMatchObject({ id: announcement.id });
        expect(await saveAnnouncement(admin, input)).toMatchObject({ id: announcement.id });
        expect(mocks.tx.announcement.create).toHaveBeenCalledTimes(1);
        await expect(saveAnnouncement(admin, { ...input, content: 'Changed content' })).rejects.toThrow('new request ID');
    });
    it('escapes HTML and strips subject line breaks', () => {
        const message = broadcastEmail('fixture@example.com', 'Hello\r\nInjected', '<script>alert(1)</script>');
        expect(message.subject).not.toMatch(/[\r\n]/);
        expect(message.html).not.toContain('<script>');
        expect(message.html).toContain('&lt;script&gt;');
    });
});
