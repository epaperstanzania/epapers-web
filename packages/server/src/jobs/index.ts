import { randomUUID } from 'node:crypto';
import { decrypt } from '@epapers/server/lib/encryption';
import { db, withTransactionRetry } from '@epapers/database';
import { logger } from '@epapers/server/lib/logger';
import { emailProvider, EmailMessage } from '@epapers/server/lib/email/provider';
import { env } from '@epapers/config/server-env';
import { scanFile, deleteFile, rollupEvents, cleanAbandoned } from './files';
import { finalizeApproval, reviewEffects } from './moderation';
import { storage } from '@epapers/server/lib/storage';
import { z } from 'zod';
import { verifyXpLedger } from './maintenance';
import { purgeExpiredPapers,expireSecurityRecords } from './retention';
import { deliverBroadcast, reserveBroadcastSlot } from './broadcast';
import { reserveDailyEmail } from './email-limits';
const types = ['email_otp', 'email', 'email_notice', 'email_broadcast', 'broadcast_notifications', 'scan_file', 'delete_file', 'delete_object', 'finalize_approval', 'review_effects'];
const payloadSchema = z.object({ fileId: z.string().uuid().optional(), paperId: z.string().uuid().optional(), reviewId: z.string().uuid().optional(), bucket: z.string().optional(), key: z.string().optional(), encrypted: z.string().optional(), announcementId: z.string().uuid().optional(), userId: z.string().uuid().optional(), sendEmail: z.boolean().optional(), cursor: z.string().uuid().optional() });
let stopping = false, lastMaintenance = 0, lastCleanup = 0, lastXpDay = '';
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
export async function tick() {
    const token = randomUUID();
    const job = await withTransactionRetry(async (tx) => {
        const candidate = await tx.job.findFirst({ where: { type: 'email_otp', runAt: { lte: new Date() }, status: 'pending' }, orderBy: { runAt: 'asc' } })
            || await tx.job.findFirst({ where: { type: { in: ['email', 'email_notice'] }, runAt: { lte: new Date() }, status: 'pending' }, orderBy: { runAt: 'asc' } })
            || await tx.job.findFirst({ where: { type: 'broadcast_notifications', runAt: { lte: new Date() }, status: 'pending' }, orderBy: { runAt: 'asc' } })
            || await tx.job.findFirst({ where: { type: { in: types }, runAt: { lte: new Date() }, status: 'pending' }, orderBy: { runAt: 'asc' } });
        if (!candidate)
            return null;
        const claim = await tx.job.updateMany({ where: { id: candidate.id, status: 'pending' }, data: { status: 'running', leaseToken: token, runAt: new Date(Date.now() + 300000), attempts: { increment: 1 } } });
        return claim.count ? candidate : null;
    });
    if (!job)
        return;
    try {
        const p = payloadSchema.parse(job.payload);
        if (job.type === 'email_broadcast') {
            const announcement = await db.announcement.findUnique({ where: { id: p.announcementId! } });
            const recipient = await db.user.findFirst({ where: { id: p.userId!, role: 'CONTRIBUTOR', status: 'ACTIVE', deletedAt: null, emailVerifiedAt: { not: null } } });
            const message = decrypt<EmailMessage>(p.encrypted!, 'email');
            if (!announcement || !announcement.isActive || announcement.deletedAt || (announcement.endsAt && announcement.endsAt <= new Date()) || !recipient || recipient.emailNormalized !== message.to.toLowerCase()) {
                await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: 'expired', leaseToken: null } }));
                return;
            }
            const retryAt = await reserveBroadcastSlot(recipient.id);
            if (retryAt) {
                await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: 'pending', leaseToken: null, attempts: { decrement: 1 }, runAt: retryAt } }));
                return;
            }
        }
        if (job.type.startsWith('email')) {
            if (env.EMAIL_PROVIDER === 'smtp') {
                // Keep twenty percent of the SMTP budget available to authentication and transactional mail.
                const allowed = await reserveDailyEmail(job.type === 'email_broadcast' ? Math.max(1, Math.floor(env.SMTP_DAILY_LIMIT * .8)) : env.SMTP_DAILY_LIMIT);
                if (!allowed) {
                    await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: 'pending', leaseToken: null, attempts: { decrement: 1 }, runAt: new Date(Date.now() + 3600000) } }));
                    return;
                }
            }
            const expired = !['email_notice', 'email_broadcast'].includes(job.type) && Date.now() - job.createdAt.getTime() > (job.type === 'email_otp' ? 600000 : 1800000);
            if (!expired) {
                const message=decrypt<EmailMessage>(p.encrypted!, 'email');
                const recipient=await db.user.findFirst({where:{emailNormalized:message.to.toLowerCase(),status:'ACTIVE'}});
                if(recipient)await emailProvider.send(message);
            }
            if (expired) {
                await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: 'expired', leaseToken: null } }));
                return;
            }
        }
        else if (job.type === 'broadcast_notifications') {
            const retryAt = await deliverBroadcast(p.announcementId!, p.sendEmail ?? false, p.cursor);
            if (retryAt) {
                await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: 'pending', leaseToken: null, attempts: { decrement: 1 }, runAt: retryAt } }));
                return;
            }
        }
        else if (job.type === 'scan_file')
            await scanFile(p.fileId!);
        else if (job.type === 'delete_file')
            await deleteFile(p.fileId!);
        else if (job.type === 'delete_object') {
            if (p.bucket !== env.R2_INCOMING_BUCKET || !p.key?.startsWith('incoming/'))
                throw new Error('Invalid cleanup target');
            await storage.delete(p.bucket, p.key);
        }
        else if (job.type === 'finalize_approval')
            await finalizeApproval(p.paperId!);
        else if (job.type === 'review_effects')
            await reviewEffects(p.paperId!, p.reviewId);
        await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: 'done', leaseToken: null, lastError: null } }));
    }
    catch {
        await withTransactionRetry(tx => tx.job.updateMany({ where: { id: job.id, leaseToken: token }, data: { status: job.attempts + 1 >= 8 ? 'failed' : 'pending', leaseToken: null, runAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** job.attempts)), lastError: 'Job processing failed' } }));
    }
}
async function run() {
    while (!stopping) {
        if (Date.now() - lastMaintenance > 60000) {
            await withTransactionRetry(async (tx) => { await tx.job.updateMany({ where: { status: 'running', type: { in: types }, runAt: { lt: new Date() } }, data: { status: 'pending', leaseToken: null } }); await tx.$executeRaw `DELETE FROM rate_limit_counters WHERE expires_at < now()`; });
            await db.appSetting.upsert({ where: { key: 'workerHeartbeat' }, create: { key: 'workerHeartbeat', value: { timestamp: new Date().toISOString() } }, update: { value: { timestamp: new Date().toISOString() }, updatedAt: new Date() } });
            await rollupEvents();
            lastMaintenance = Date.now();
        }
        if (Date.now() - lastCleanup > 3600000) {
            await cleanAbandoned();
            await expireSecurityRecords();
            try { await purgeExpiredPapers(); } catch { logger.error('Retention cleanup failed; retrying on next maintenance cycle'); }
            lastCleanup = Date.now();
        }
        const day = new Date().toISOString().slice(0, 10);
        if (day !== lastXpDay) {
            await verifyXpLedger();
            lastXpDay = day;
        }
        await tick();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await db.$disconnect();
}
run().catch(() => { logger.error('Worker failed'); process.exitCode = 1; });
