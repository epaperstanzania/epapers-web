import { db, withTransactionRetry } from '@epapers/database';
import { storage } from '@epapers/server/lib/storage';
import { env } from '@epapers/config/server-env';
import { scanProvider } from '@epapers/server/modules/uploads/scan';
import { invalidateDownloads } from '@epapers/server/lib/download-cache';
import { Prisma } from '@epapers/database/client';
import { encrypt } from '@epapers/server/lib/encryption';
import { reviewEmail } from '@epapers/server/lib/email/templates';
export async function scanFile(fileId: string) {
    const f = await db.storedFile.findUnique({ where: { id: fileId } });
    if (!f || f.scanStatus !== 'PENDING' || !f.completedAt)
        return;
    const result = await scanProvider.scan(await storage.stream(f.bucketName, f.objectKey), Number(f.sizeBytes));
    await withTransactionRetry(async (tx) => {
        const changed = await tx.storedFile.updateMany({ where: { id: f.id, scanStatus: 'PENDING' }, data: { scanStatus: result.clean ? 'CLEAN' : 'REJECTED', scannedAt: new Date(), sha256Hex: result.sha256Hex, pageCount: result.pageCount } });
        if (!changed.count)
            return;
        const papers = await tx.paper.findMany({ where: { OR: [{ examFileId: f.id }, { markingSchemeFileId: f.id }] } });
        for (const p of papers) {
            if (!result.clean) {
                await tx.paper.update({ where: { id: p.id }, data: { status: 'REJECTED', rejectionReason: result.reason } });
                invalidateDownloads(p.examFileId, p.markingSchemeFileId);
                if (p.status !== 'REJECTED') {
                    await tx.notification.create({ data: { userId: p.uploadedByUserId, title: 'Upload rejected', type: 'paper_rejected', message: result.reason || 'PDF validation failed', link: '/papers/' + p.id } });
                    await tx.auditLog.create({ data: { action: 'SCAN_REJECTED', targetType: 'paper', targetId: p.id, reason: result.reason } });
                    const uploader = await tx.user.findUnique({ where: { id: p.uploadedByUserId } });
                    if (uploader)
                        await tx.job.upsert({ where: { dedupeKey: 'scan_rejection:' + p.id }, create: { type: 'email_notice', dedupeKey: 'scan_rejection:' + p.id, payload: { encrypted: encrypt(reviewEmail(uploader.email, false, result.reason || 'PDF validation failed'), 'email') } }, update: {} });
                }
            }
            else {
                if (p.examFileId === f.id)
                    await tx.paper.update({ where: { id: p.id }, data: { pageCount: result.pageCount } });
                const duplicate = await tx.storedFile.findFirst({ where: { id: { not: f.id }, sha256Hex: result.sha256Hex, examPaper: { id: { not: p.id }, deletedAt: null, status: { in: ['PENDING', 'APPROVED'] } } } });
                if (duplicate)
                    await tx.paper.update({ where: { id: p.id }, data: { duplicateWarning: true } });
                if (p.status === 'APPROVED')
                    await tx.job.create({ data: { type: 'finalize_approval', payload: { paperId: p.id } } });
            }
        }
        if (!result.clean)
            await tx.job.create({ data: { type: 'delete_file', payload: { fileId: f.id } } });
    });
}
export async function publishFile(fileId: string) {
    const f = await db.storedFile.findUnique({ where: { id: fileId } });
    if (!f || f.scanStatus !== 'CLEAN' || f.publishedAt)
        return;
    const approved = await db.paper.findFirst({ where: { status: 'APPROVED', OR: [{ examFileId: f.id }, { markingSchemeFileId: f.id }] } });
    if (!approved)
        return;
    const key = 'published/' + f.id + '.pdf';
    await storage.copy(f.bucketName, f.objectKey, env.R2_PUBLISHED_BUCKET, key);
    const moved = await withTransactionRetry(async (tx) => {
        if (!await tx.paper.findFirst({ where: { status: 'APPROVED', OR: [{ examFileId: f.id }, { markingSchemeFileId: f.id }] } }))
            return false;
        const updated = await tx.storedFile.updateMany({ where: { id: f.id, scanStatus: 'CLEAN', publishedAt: null }, data: { bucketName: env.R2_PUBLISHED_BUCKET, objectKey: key, publishedAt: new Date() } });
        if (updated.count)
            await tx.job.create({ data: { type: 'delete_object', payload: { bucket: f.bucketName, key: f.objectKey } } });
        return updated.count > 0;
    });
    if (!moved && !(await db.storedFile.findUnique({ where: { id: f.id } }))?.publishedAt)
        await storage.delete(env.R2_PUBLISHED_BUCKET, key);
}
export async function deleteFile(fileId: string) { const f = await db.storedFile.findUnique({ where: { id: fileId } }); if (!f || f.scanStatus !== 'REJECTED')
    return; invalidateDownloads(f.id); await storage.delete(f.bucketName, f.objectKey); }
export async function cleanAbandoned() {
    const rows = await db.storedFile.findMany({ where: { completedAt: null, examPaper: null, markingPapers: { none: {} }, createdAt: { lt: new Date(Date.now() - 86400000) } }, take: 25 });
    for (const f of rows) {
        await storage.delete(f.bucketName, f.objectKey);
        await withTransactionRetry(tx => tx.storedFile.deleteMany({ where: { id: f.id, completedAt: null, examPaper: null, markingPapers: { none: {} } } }));
    }
}
export async function rollupEvents() {
    await withTransactionRetry(async (tx) => {
        for (const kind of ['view', 'download'] as const) {
            const args = { where: { processedAt: null }, take: 500, orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] };
            const rows = kind === 'view' ? await tx.paperViewEvent.findMany(args) : await tx.paperDownloadEvent.findMany(args);
            if (!rows.length)
                continue;
            const ids = Prisma.join(rows.map(r => Prisma.sql `${r.id}::UUID`));
            // Aggregate update and markers commit together; concurrent batches retry serializably.
            if (kind === 'view')
                await tx.$executeRaw `UPDATE papers SET views_count=papers.views_count+c.amount FROM (SELECT paper_id,count(*) AS amount FROM paper_view_events WHERE id IN (${ids}) GROUP BY paper_id) c WHERE papers.id=c.paper_id`;
            else
                await tx.$executeRaw `UPDATE papers SET downloads_count=papers.downloads_count+c.amount FROM (SELECT paper_id,count(*) AS amount FROM paper_download_events WHERE id IN (${ids}) GROUP BY paper_id) c WHERE papers.id=c.paper_id`;
            const update = { where: { id: { in: rows.map(r => r.id) }, processedAt: null }, data: { processedAt: new Date() } };
            if (kind === 'view')
                await tx.paperViewEvent.updateMany(update);
            else
                await tx.paperDownloadEvent.updateMany(update);
        }
    });
}
