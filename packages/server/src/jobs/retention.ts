import { withDeleted, withRetry, withTransactionRetry } from '@epapers/database';
import { storage } from '@epapers/server/lib/storage';
import { invalidateDownloads } from '@epapers/server/lib/download-cache';
export async function purgeExpiredPapers() {
    const raw = withDeleted();
    const setting = await raw.appSetting.findUnique({ where: { key: 'retentionDays' } });
    const cutoff = new Date(Date.now() - Number(setting?.value || 90) * 86400000);
    const candidates = await raw.paper.findMany({ where: { deletedAt: { lt: cutoff } }, select: { id: true }, take: 20, orderBy: { deletedAt: 'asc' } });
    for (const candidate of candidates) {
        const files = await withRetry(() => raw.$transaction(async (tx) => { await tx.$queryRaw `SELECT id FROM papers WHERE id=${candidate.id}::UUID FOR UPDATE`; const p = await tx.paper.findFirst({ where: { id: candidate.id, deletedAt: { lt: cutoff } }, include: { examFile: true, markingSchemeFile: true } }); if (!p)
            return []; await tx.paper.update({ where: { id: p.id }, data: { purgeStartedAt: p.purgeStartedAt || new Date() } }); return [p.examFile, ...(p.markingSchemeFile ? [p.markingSchemeFile] : [])]; }, { isolationLevel: 'Serializable', timeout: 20000 }));
        if (!files.length)
            continue;
        invalidateDownloads(...files.map(f => f.id));
        for (const f of files)
            await storage.delete(f.bucketName, f.objectKey);
        await withRetry(() => raw.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM papers WHERE id=${candidate.id}::UUID FOR UPDATE`;
            const p = await tx.paper.findFirst({ where: { id: candidate.id, deletedAt: { lt: cutoff }, purgeStartedAt: { not: null } } });
            if (!p)
                return;
            await tx.xpLedger.updateMany({ where: { paperId: p.id }, data: { paperId: null } });
            await tx.paperReview.deleteMany({ where: { paperId: p.id } });
            await tx.flaggedReport.deleteMany({ where: { paperId: p.id } });
            await tx.takedownRequest.deleteMany({ where: { paperId: p.id } });
            await tx.paperViewEvent.deleteMany({ where: { paperId: p.id } });
            await tx.paperDownloadEvent.deleteMany({ where: { paperId: p.id } });
            await tx.auditLog.create({ data: { action: 'PAPER_PURGED', targetType: 'paper', targetId: p.id, reason: 'Retention period expired' } });
            await tx.paper.delete({ where: { id: p.id } });
            await tx.storedFile.deleteMany({ where: { id: { in: files.map(f => f.id) }, examPaper: null, markingPapers: { none: {} } } });
        }, { isolationLevel: 'Serializable', timeout: 20000 }));
    }
}
export async function expireSecurityRecords() { await withTransactionRetry(async (tx) => { await tx.userSession.updateMany({ where: { expiresAt: { lte: new Date() }, revokedAt: null }, data: { revokedAt: new Date() } }); await tx.job.updateMany({ where: { type: { in: ['email', 'email_otp', 'email_notice', 'email_broadcast'] }, status: { in: ['done', 'expired', 'failed'] }, createdAt: { lt: new Date(Date.now() - 7 * 86400000) } }, data: { payload: {} } }); await tx.adminAuthChallenge.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } }); await tx.authChallenge.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } }); }); }
