import { withTransactionRetry } from '@epapers/database';
import { grantApproval } from '@epapers/server/modules/gamification/service';
import { encrypt } from '@epapers/server/lib/encryption';
import { reviewEmail } from '@epapers/server/lib/email/templates';
import { publishFile } from './files';
export async function finalizeApproval(paperId: string) {
    const ids = await withTransactionRetry(async (tx) => {
        await tx.$queryRaw `SELECT id FROM papers WHERE id=${paperId}::UUID FOR UPDATE`;
        const p = await tx.paper.findFirst({ where: { id: paperId, status: 'APPROVED' }, include: { examFile: true, markingSchemeFile: true } });
        if (!p || p.examFile.scanStatus !== 'CLEAN' || (p.markingSchemeFile && p.markingSchemeFile.scanStatus !== 'CLEAN'))
            return [];
        const reward = await grantApproval(tx, p);
        if (reward.awarded) {
            await tx.notification.create({ data: { userId: p.uploadedByUserId, title: 'Paper approved', type: 'paper_approved', message: 'Your contribution was approved.', link: '/papers/' + p.id } });
            await tx.auditLog.create({ data: { action: 'LECTURER_AUTO_APPROVED', targetType: 'paper', targetId: p.id, reason: 'Verified lecturer department match' } });
            await tx.job.upsert({ where: { dedupeKey: 'auto_notice:' + p.id }, create: { type: 'review_effects', dedupeKey: 'auto_notice:' + p.id, payload: { paperId: p.id, action: 'approved' } }, update: {} });
        }
        return [p.examFileId, ...(p.markingSchemeFileId ? [p.markingSchemeFileId] : [])];
    });
    for (const id of ids)
        await publishFile(id);
}
export async function reviewEffects(paperId: string, reviewId?: string) {
    await withTransactionRetry(async (tx) => {
        const p = await tx.paper.findUnique({ where: { id: paperId }, include: { uploader: true } });
        if (!p || p.uploader.deletedAt)
            return;
        const review = reviewId ? await tx.paperReview.findFirst({ where: { id: reviewId, paperId } }) : null;
        if (reviewId && !review)
            return;
        const action = review?.action || 'approved';
        if (action === 'edited')
            return;
        const dedupeKey = 'review_notice:' + (reviewId || paperId);
        await tx.job.upsert({ where: { dedupeKey }, create: { type: 'email_notice', dedupeKey, payload: { encrypted: encrypt(reviewEmail(p.uploader.email, action === 'approved', review?.reason || ''), 'email') } }, update: {} });
        if (action === 'approved')
            await tx.job.upsert({ where: { dedupeKey: 'publish:' + (reviewId || paperId) }, create: { type: 'finalize_approval', dedupeKey: 'publish:' + (reviewId || paperId), payload: { paperId } }, update: {} });
    });
}
