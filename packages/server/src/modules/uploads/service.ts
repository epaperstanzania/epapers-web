import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { User } from '@epapers/database/client';
import { db, withTransactionRetry, TransactionClient } from '@epapers/database';
import { env } from '@epapers/config/server-env';
import { fail } from '@epapers/config/errors';
import { storage } from '@epapers/server/lib/storage';
import { cachedDownload } from '@epapers/server/lib/download-cache';
import { authorize } from '@epapers/server/modules/auth/service';
import { activeModule, publicPaper, page, cursorId } from '@epapers/server/modules/catalog/service';
import { uploadSchemas } from '@epapers/server/modules/uploads/schemas';
import { levelTitleForXp } from '@epapers/server/lib/levels';
import { paperDto, paperInclude } from '@epapers/server/modules/catalog/dto';
function uploader(user: User) { authorize(user, { roles: ['contributor', 'lecturer'], requireVerifiedEmail: true }); }
export function validPdfEdges(first: Buffer, last: Buffer) { return /^[\t\n\r ]{0,8}%PDF-(1\.[0-7]|2\.0)(?:\s|$)/.test(first.toString('latin1')) && /%%EOF[\t\n\r ]*$/.test(last.toString('latin1')); }
async function currentUploader(tx: TransactionClient, id: string) { await tx.$queryRaw `SELECT id FROM users WHERE id=${id}::UUID FOR UPDATE`; const u = await tx.user.findUnique({ where: { id } }); if (!u)
    fail(401, 'UNAUTHORIZED', 'Authentication required'); uploader(u); const lockdown = await tx.appSetting.findUnique({ where: { key: 'lockdown' } }); if (lockdown?.value === true)
    fail(403, 'LOCKDOWN', 'Uploads are temporarily disabled'); return u; }
export async function presign(user: User, input: z.infer<typeof uploadSchemas.presign>) {
    uploader(user);
    const file = await withTransactionRetry(async (tx) => {
        await currentUploader(tx, user.id);
        const day = new Date();
        day.setUTCHours(0, 0, 0, 0);
        if (await tx.storedFile.count({ where: { ownerUserId: user.id, createdAt: { gte: day } } }) >= env.DAILY_UPLOAD_QUOTA)
            fail(429, 'UPLOAD_QUOTA', 'Daily upload quota reached');
        return tx.storedFile.create({ data: { ownerUserId: user.id, bucketName: env.R2_INCOMING_BUCKET, objectKey: `incoming/${user.id}/${randomUUID()}.pdf`, originalFilename: input.filename, contentType: 'application/pdf', sizeBytes: BigInt(input.sizeBytes) } });
    });
    return { uploadId: file.id, uploadUrl: await storage.presign(file.bucketName, file.objectKey, input.sizeBytes), expiresAt: new Date(Date.now() + 300000).toISOString(), headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(input.sizeBytes), 'If-None-Match': '*' } };
}
export async function complete(user: User, id: string) {
    uploader(user);
    const f = await db.storedFile.findFirst({ where: { id, ownerUserId: user.id } });
    if (!f)
        fail(404, 'NOT_FOUND', 'Upload not found');
    if (f.completedAt || f.scanStatus === 'REJECTED')
        return { uploadId: f.id, scanStatus: f.scanStatus.toLowerCase(), completed: !!f.completedAt };
    if (Date.now() - f.createdAt.getTime() > 86400000)
        fail(409, 'UPLOAD_EXPIRED', 'Upload expired');
    let head;
    try {
        head = await storage.head(f.bucketName, f.objectKey);
    }
    catch {
        fail(409, 'UPLOAD_MISSING', 'Upload is not available');
    }
    const size = Number(f.sizeBytes);
    let valid = head.size === size && size <= env.MAX_UPLOAD_BYTES && head.type === 'application/pdf';
    if (valid) {
        const [first, last] = await Promise.all([storage.range(f.bucketName, f.objectKey, 'bytes=0-1023'), storage.range(f.bucketName, f.objectKey, `bytes=${Math.max(0, size - 1024)}-${size - 1}`)]);
        valid = validPdfEdges(first, last);
    }
    await withTransactionRetry(async (tx) => {
        await currentUploader(tx, user.id);
        const updated = await tx.storedFile.updateMany({ where: { id, ownerUserId: user.id, completedAt: null, scanStatus: 'PENDING' }, data: valid ? { completedAt: new Date() } : { scanStatus: 'REJECTED', scannedAt: new Date() } });
        if (updated.count)
            await tx.job.create({ data: { type: valid ? 'scan_file' : 'delete_file', payload: { fileId: id } } });
    });
    if (!valid) {
        try {
            await storage.delete(f.bucketName, f.objectKey);
        }
        catch { /* Durable deletion job retries storage failures. */ }
    }
    return { uploadId: id, scanStatus: valid ? 'pending' : 'rejected', completed: valid };
}
export async function duplicateCheck(user: User, input: z.infer<typeof uploadSchemas.duplicate>) { uploader(user); return { duplicateWarning: !!await db.paper.findFirst({ where: { moduleId: input.moduleId, category: input.category, testNumber: input.testNumber, academicYearStart: input.academicYear, semester: input.semester, status: { in: ['PENDING', 'APPROVED'] } } }) }; }
export async function createPaper(user: User, input: z.infer<typeof uploadSchemas.create>) {
    uploader(user);
    return withTransactionRetry(async (tx) => {
        const current = await currentUploader(tx, user.id);
        const m = await tx.module.findFirst({ where: { id: input.moduleId, ...activeModule }, include: { program: true } });
        if (!m)
            fail(422, 'INVALID_MODULE', 'Choose an active module');
        if (m.semester !== input.semester)
            fail(422, 'INVALID_SEMESTER', 'Semester must match the module');
        const ids = [input.examUploadId, ...(input.markingSchemeUploadId ? [input.markingSchemeUploadId] : [])];
        if (new Set(ids).size !== ids.length)
            fail(422, 'INVALID_UPLOAD', 'Use separate exam and marking scheme uploads');
        const files = await tx.storedFile.findMany({ where: { id: { in: ids }, ownerUserId: user.id, completedAt: { not: null }, scanStatus: { not: 'REJECTED' } }, include: { examPaper: true, markingPapers: true } });
        if (files.length !== ids.length)
            fail(422, 'INVALID_UPLOAD', 'Uploads must be completed and owned by you');
        if (files.some(f => f.examPaper || f.markingPapers.length))
            fail(409, 'UPLOAD_USED', 'Upload has already been submitted');
        const duplicateWarning = !!await tx.paper.findFirst({ where: { moduleId: m.id, category: input.category, testNumber: input.testNumber, academicYearStart: input.academicYear, semester: input.semester, status: { in: ['PENDING', 'APPROVED'] } } }) || !!await tx.storedFile.findFirst({ where: { id: { notIn: ids }, sha256Hex: { in: files.flatMap(f => f.sha256Hex ? [f.sha256Hex] : []) }, examPaper: { status: { in: ['PENDING', 'APPROVED'] }, deletedAt: null } } });
        const auto = current.role === 'LECTURER' && !!current.lecturerVerifiedAt && current.homeDepartmentId === m.program.departmentId;
        const p = await tx.paper.create({ data: { moduleId: m.id, uploadedByUserId: current.id, title: input.title, category: input.category, testNumber: input.testNumber, academicYearStart: input.academicYear, semester: input.semester, examPeriod: input.examPeriod, examFileId: input.examUploadId, markingSchemeFileId: input.markingSchemeUploadId, status: auto ? 'APPROVED' : 'PENDING', duplicateWarning } });
        await tx.auditLog.create({ data: { actorUserId: current.id, action: 'PAPER_SUBMITTED', targetType: 'paper', targetId: p.id } });
        if (auto)
            await tx.job.create({ data: { type: 'finalize_approval', payload: { paperId: p.id } } });
        return { id: p.id, status: p.status.toLowerCase(), duplicateWarning, levelTitle: levelTitleForXp(current.xp) };
    });
}
export async function download(id: string, kind: 'exam' | 'marking_scheme', hash: string) {
    const p = await db.paper.findFirst({ where: { id, ...publicPaper }, include: { examFile: true, markingSchemeFile: true, module: true } });
    if (!p)
        fail(404, 'NOT_FOUND', 'Paper not found');
    const f = kind === 'exam' ? p.examFile : p.markingSchemeFile;
    if (!f || f.scanStatus !== 'CLEAN' || !f.publishedAt || f.bucketName !== env.R2_PUBLISHED_BUCKET)
        fail(409, 'FILE_NOT_READY', 'File is not available');
    const filename = `${p.module.code.replace(/[^a-zA-Z0-9_-]/g, '_')}_${p.category}_${p.academicYearStart}_Sem${p.semester}${kind === 'marking_scheme' ? '_Scheme' : ''}.pdf`;
    const url = await cachedDownload(f.id, kind, () => storage.download(f.bucketName, f.objectKey, filename));
    await withTransactionRetry(async (tx) => { if (!await tx.paper.findFirst({ where: { id, ...publicPaper } }))
        fail(404, 'NOT_FOUND', 'Paper not found'); await tx.paperDownloadEvent.create({ data: { paperId: id, ipHash: hash } }); });
    return { ...url, filename };
}
export async function view(id: string, hash: string) { await withTransactionRetry(async (tx) => { if (!await tx.paper.findFirst({ where: { id, ...publicPaper } }))
    fail(404, 'NOT_FOUND', 'Paper not found'); if (!await tx.paperViewEvent.findFirst({ where: { paperId: id, ipHash: hash, createdAt: { gte: new Date(Date.now() - 60000) } } }))
    await tx.paperViewEvent.create({ data: { paperId: id, ipHash: hash } }); }); return { message: 'View recorded' }; }
export async function myPapers(user: User, q: {
    cursor?: string;
    limit: number;
}) { authorize(user, {}); const id = cursorId(q.cursor); return page(await db.paper.findMany({ where: { uploadedByUserId: user.id }, include: paperInclude, orderBy: { id: 'desc' }, take: q.limit + 1, ...(id ? { cursor: { id }, skip: 1 } : {}) }), q.limit, p => ({ ...paperDto(p), status: p.status.toLowerCase(), rejectionReason: p.rejectionReason, duplicateWarning: p.duplicateWarning, levelTitle: levelTitleForXp(user.xp) })); }
