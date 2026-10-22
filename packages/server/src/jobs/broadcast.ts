import { withTransactionRetry } from '@epapers/database';
import { encrypt } from '@epapers/server/lib/encryption';
import { broadcastEmail } from '@epapers/server/lib/email/templates';
export const BROADCAST_BATCH_SIZE = 25;

/** Small, atomic batches: a delivery receipt prevents duplicates after lease recovery. */
export async function deliverBroadcast(announcementId: string, sendEmail: boolean, cursor?: string) {
    return withTransactionRetry(async tx => {
        const announcement = await tx.announcement.findUnique({ where: { id: announcementId } });
        const now = new Date();
        if (!announcement || announcement.deletedAt || !announcement.isActive || (announcement.endsAt && announcement.endsAt <= now)) return;
        if (announcement.startsAt > now) return announcement.startsAt;
        const users = await tx.user.findMany({ where: { status: 'ACTIVE', deletedAt: null, joinedAt: { lte: announcement.createdAt }, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: BROADCAST_BATCH_SIZE });
        for (const user of users) {
            const dedupeKey = `broadcast_receipt:${announcementId}:${user.id}`;
            if (await tx.job.findUnique({ where: { dedupeKey } })) continue;
            await tx.notification.create({ data: { userId: user.id, title: announcement.title, message: announcement.content, type: 'broadcast' } });
            await tx.job.create({ data: { dedupeKey, type: 'broadcast_receipt', status: 'done', payload: {} } });
            if (sendEmail && user.role === 'CONTRIBUTOR' && user.emailVerifiedAt) {
                await tx.job.upsert({ where: { dedupeKey: `broadcast_email:${announcementId}:${user.id}` }, create: { dedupeKey: `broadcast_email:${announcementId}:${user.id}`, type: 'email_broadcast', payload: { announcementId, userId: user.id, encrypted: encrypt(broadcastEmail(user.email, announcement.title, announcement.content), 'email') } }, update: {} });
            }
        }
        if (users.length === BROADCAST_BATCH_SIZE) {
            const nextCursor = users[users.length - 1].id;
            const dedupeKey = `broadcast_batch:${announcementId}:${nextCursor}`;
            await tx.job.upsert({ where: { dedupeKey }, create: { dedupeKey, type: 'broadcast_notifications', payload: { announcementId, sendEmail, cursor: nextCursor } }, update: {} });
        }
    });
}

/** Shared database slot applies across worker processes. Deferrals do not consume retry attempts. */
export async function reserveBroadcastSlot(userId: string): Promise<Date | null> {
    return withTransactionRetry(async tx => {
        const now = new Date();
        for (const [key] of [['broadcast_email:recipient:' + userId, 3600], ['broadcast_email:global', 10]] as const) {
            const rows = await tx.$queryRaw<Array<{ expires_at: Date }>>`SELECT expires_at FROM rate_limit_counters WHERE key=${key} FOR UPDATE`;
            if (rows[0]?.expires_at > now) return rows[0].expires_at;
        }
        for (const [key, seconds] of [['broadcast_email:recipient:' + userId, 3600], ['broadcast_email:global', 10]] as const) {
            await tx.$executeRaw`INSERT INTO rate_limit_counters(key,hits,expires_at) VALUES (${key},1,now()+${seconds} * INTERVAL '1 second') ON CONFLICT(key) DO UPDATE SET hits=1,expires_at=excluded.expires_at`;
        }
        return null;
    });
}
