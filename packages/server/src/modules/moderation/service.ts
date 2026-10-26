import 'server-only';
import { User } from '@epapers/database/client';
import { z } from 'zod';
import { db, withTransactionRetry, TransactionClient } from '@epapers/database';
import { fail } from '@epapers/config/errors';
import { authorize } from '@epapers/server/modules/auth/service';
import { activeModule, activeProgram, publicPaper, page, cursorId } from '@epapers/server/modules/catalog/service';
import { paperDto, paperInclude } from '@epapers/server/modules/catalog/dto';
import { grantApproval } from '@epapers/server/modules/gamification/service';
import { invalidateDownloads } from '@epapers/server/lib/download-cache';
import { storage } from '@epapers/server/lib/storage';
import { levelTitleForXp } from '@epapers/server/lib/levels';
import { moderationSchemas } from '@epapers/server/modules/moderation/schemas';
async function adminCurrent(tx: TransactionClient, id: string) { const u = await tx.user.findUnique({ where: { id } }); if (!u)
    fail(401, 'UNAUTHORIZED', 'Authentication required'); authorize(u, { roles: ['admin'] }); }
async function audit(tx: TransactionClient, actor: string, action: string, targetType: string, targetId: string, reason: string) { await tx.auditLog.create({ data: { actorUserId: actor, action, targetType, targetId, reason } }); }
async function lockPaper(tx: TransactionClient, id: string) { await tx.$queryRaw `SELECT id FROM papers WHERE id=${id}::UUID FOR UPDATE`; const p = await tx.paper.findUnique({ where: { id }, include: { examFile: true, markingSchemeFile: true } }); if (!p)
    fail(404, 'NOT_FOUND', 'Paper not found'); return p; }
export async function review(admin: User, id: string, input: z.infer<typeof moderationSchemas.review>) {
    authorize(admin, { roles: ['admin'] });
    const result = await withTransactionRetry(async (tx) => {
        await adminCurrent(tx, admin.id);
        const p = await lockPaper(tx, id);
        const status = input.action === 'approved' ? 'APPROVED' : input.action === 'rejected' ? 'REJECTED' : input.action === 'marked_spam' ? 'SPAM' : p.status;
        if (input.action === 'approved' && (p.examFile.scanStatus !== 'CLEAN' || (p.markingSchemeFile && p.markingSchemeFile.scanStatus !== 'CLEAN')))
            fail(409, 'SCAN_PENDING', 'All uploads must pass scanning before approval');
        if (input.action === 'approved' && !await tx.module.findFirst({ where: { id: input.moduleId || p.moduleId, ...activeModule } }))
            fail(409, 'MODULE_INACTIVE', 'Choose an active module before approving');
        if (input.moduleId) {
            const m = await tx.module.findFirst({ where: { id: input.moduleId, ...activeModule } });
            if (!m || m.semester !== p.semester)
                fail(422, 'INVALID_MODULE', 'Choose an active module with the same semester');
        }
        if (status === p.status && input.action !== 'edited' && !input.title && !input.moduleId)
            return { id, status: p.status.toLowerCase(), examFileId: p.examFileId, markingSchemeFileId: p.markingSchemeFileId };
        const updated = await tx.paper.update({ where: { id }, data: { status, title: input.title, moduleId: input.moduleId, rejectionReason: input.action === 'edited' ? p.rejectionReason : ['REJECTED', 'SPAM'].includes(status) ? input.reason : null, reviewedByUserId: admin.id, reviewedAt: new Date() } });
        const r = await tx.paperReview.create({ data: { paperId: id, reviewerUserId: admin.id, action: input.action, reason: input.reason, correctedTitle: input.title, correctedModuleCode: input.moduleId ? (await tx.module.findUniqueOrThrow({ where: { id: input.moduleId } })).code : undefined } });
        if (input.action === 'approved') {
            await grantApproval(tx, updated);
            await tx.paperRequest.updateMany({ where: {
                status: 'pending', moduleId: updated.moduleId, category: updated.category,
                testNumber: updated.testNumber ?? 0, academicYearStart: updated.academicYearStart,
                ...(updated.markingSchemeFileId ? {} : { wantsMarkingScheme: false }),
            }, data: { status: 'fulfilled', reviewedByUserId: admin.id, reviewedAt: new Date(), reviewNote: 'Matching paper approved' } });
        }
        if (input.action !== 'edited')
            await tx.notification.create({ data: { userId: p.uploadedByUserId, title: status === 'APPROVED' ? 'Paper approved' : 'Paper reviewed', type: status === 'APPROVED' ? 'paper_approved' : 'paper_rejected', message: status === 'APPROVED' ? 'Your contribution was approved.' : input.reason, link: '/papers/' + id } });
        await audit(tx, admin.id, 'PAPER_' + input.action.toUpperCase(), 'paper', id, input.reason);
        // Durable intent commits atomically; the worker dispatches email/move jobs after commit.
        await tx.job.create({ data: { type: 'review_effects', payload: { paperId: id, reviewId: r.id, action: input.action } } });
        return { id, status: status.toLowerCase(), examFileId: p.examFileId, markingSchemeFileId: p.markingSchemeFileId };
    });
    invalidateDownloads(result.examFileId, result.markingSchemeFileId);
    const p = await db.paper.findUniqueOrThrow({ where: { id }, include: { uploader: true } });
    return { id: result.id, status: result.status, levelTitle: levelTitleForXp(p.uploader.xp) };
}
export async function reviewFile(admin: User, id: string, kind: 'exam' | 'marking_scheme') { authorize(admin, { roles: ['admin'] }); const p = await db.paper.findUnique({ where: { id }, include: { examFile: true, markingSchemeFile: true } }); if (!p)
    fail(404, 'NOT_FOUND', 'Paper not found'); const f = kind === 'exam' ? p.examFile : p.markingSchemeFile; if (!f || f.scanStatus !== 'CLEAN')
    fail(409, 'FILE_NOT_READY', 'File must pass scanning before review'); return { url: await storage.download(f.bucketName, f.objectKey, 'Review.pdf', 120), expiresAt: new Date(Date.now() + 120000).toISOString(), filename: 'Review.pdf' }; }
export async function adminPapers(admin: User, q: z.infer<typeof moderationSchemas.adminPapers>) { authorize(admin, { roles: ['admin'] }); const id = cursorId(q.cursor); return page(await db.paper.findMany({ where: { status: q.status, moduleId: q.moduleId, module: { programId: q.programId, program: { departmentId: q.departmentId } } }, include: paperInclude, orderBy: { id: 'desc' }, take: q.limit + 1, ...(id ? { cursor: { id }, skip: 1 } : {}) }), q.limit, p => ({ ...paperDto(p), status: p.status.toLowerCase(), rejectionReason: p.rejectionReason, duplicateWarning: p.duplicateWarning, scanStatus: p.examFile.scanStatus.toLowerCase() })); }
export async function adminPaper(admin: User, id: string) { authorize(admin, { roles: ['admin'] }); const p = await db.paper.findUnique({ where: { id }, include: paperInclude }); if (!p)
    fail(404, 'NOT_FOUND', 'Paper not found'); return { ...paperDto(p), status: p.status.toLowerCase(), duplicateWarning: p.duplicateWarning, rejectionReason: p.rejectionReason, uploads: { exam: { id: p.examFile.id, scanStatus: p.examFile.scanStatus.toLowerCase() }, markingScheme: p.markingSchemeFile ? { id: p.markingSchemeFile.id, scanStatus: p.markingSchemeFile.scanStatus.toLowerCase() } : null }, reviews: (await db.paperReview.findMany({ where: { paperId: id }, orderBy: { createdAt: 'desc' }, take: 100 })).map(r => ({ id: r.id, action: r.action, reason: r.reason, createdAt: r.createdAt.toISOString() })) }; }
export async function flag(input: z.infer<typeof moderationSchemas.flags>, user: User) {
    authorize(user, {}); return withTransactionRetry(async (tx) => { if (!await tx.paper.findFirst({ where: { id: input.paperId, ...publicPaper } }))
    fail(404, 'NOT_FOUND', 'Paper not found'); const r = await tx.flaggedReport.create({ data: { paperId: input.paperId, reason: input.reason, details: input.details, reportedByUserId: user?.id } }); return { id: r.id, status: r.status }; }); }
export async function takedown(input: z.infer<typeof moderationSchemas.takedowns>, user: User) {
    authorize(user, {}); return withTransactionRetry(async (tx) => { if (!await tx.paper.findFirst({ where: { id: input.paperId, ...publicPaper } }))
    fail(404, 'NOT_FOUND', 'Paper not found'); const r = await tx.takedownRequest.create({ data: { paperId: input.paperId, requesterFullName: input.requesterFullName, requesterEmail: input.requesterEmail, affiliation: input.affiliation, reason: input.reason, evidence: input.evidence, requesterUserId: user?.id } }); return { id: r.id, status: r.status }; }); }
export async function moduleRequest(input: z.infer<typeof moderationSchemas.moduleRequests>, user?: User) { if (user)
    authorize(user, {}); return withTransactionRetry(async (tx) => { if (!await tx.program.findFirst({ where: { id: input.programId, departmentId: input.departmentId, ...activeProgram } }))
    fail(422, 'INVALID_PROGRAM', 'Program must belong to the selected department'); if (await tx.module.findFirst({ where: { programId: input.programId, codeNormalized: input.moduleCode.toLowerCase() } }))
    fail(409, 'MODULE_EXISTS', 'Module code already exists'); const r = await tx.moduleRequest.create({ data: { programId: input.programId, requestedByUserId: user?.id, moduleCode: input.moduleCode, moduleName: input.moduleName, academicYearStart: input.academicYear, semester: input.semester, description: input.description } }); if (user) await audit(tx, user.id, 'MODULE_REQUEST_CREATED', 'module_request', r.id, ''); return { id: r.id, status: r.status }; }); }
export async function paperRequest(input: z.infer<typeof moderationSchemas.paperRequests>, user?: User) {
    if (user) authorize(user, {});
    const module = await db.module.findFirst({ where: { id: input.moduleId, ...activeModule } });
    if (!module) fail(422, 'INVALID_MODULE', 'Choose an active module');
    const testNumber = input.testNumber ?? 0;
    if (await db.paper.findFirst({ where: { moduleId: module.id, category: input.category, testNumber: input.testNumber ?? null, academicYearStart: input.academicYear, ...publicPaper, ...(input.wantsMarkingScheme ? { markingSchemeFileId: { not: null } } : {}) }, select: { id: true } }))
        fail(409, 'PAPER_AVAILABLE', 'This paper is already available in the archive');
    return withTransactionRetry(async tx => {
        if (user) {
            const existing = await tx.paperRequest.findFirst({ where: { requestedByUserId: user.id, moduleId: module.id, category: input.category, testNumber, academicYearStart: input.academicYear, wantsMarkingScheme: input.wantsMarkingScheme } });
            if (existing) return { id: existing.id, status: existing.status };
        }
        const created = await tx.paperRequest.create({ data: { moduleId: module.id, requestedByUserId: user?.id, category: input.category, testNumber, academicYearStart: input.academicYear, wantsMarkingScheme: input.wantsMarkingScheme, description: input.description } });
        if (user) await audit(tx, user.id, 'PAPER_REQUEST_CREATED', 'paper_request', created.id, '');
        return { id: created.id, status: created.status };
    });
}
export async function paperRequestSuggestions(user: User) {
    authorize(user, { roles: ['contributor', 'lecturer', 'admin'] });
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const groups = await db.paperRequest.groupBy({ by: ['moduleId', 'category', 'testNumber', 'academicYearStart', 'wantsMarkingScheme'], where: { status: 'pending', createdAt: { gte: since }, module: activeModule }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5 });
    const modules = await db.module.findMany({ where: { id: { in: groups.map(group => group.moduleId) } }, select: { id: true, code: true, name: true, semester: true } });
    const byId = new Map(modules.map(module => [module.id, module]));
    return groups.flatMap(group => { const module = byId.get(group.moduleId); return module ? [{ moduleId: module.id, moduleCode: module.code, moduleName: module.name, semester: module.semester, category: group.category, testNumber: group.testNumber || null, academicYear: group.academicYearStart, wantsMarkingScheme: group.wantsMarkingScheme, requestsThisWeek: group._count.id }] : []; });
}
export async function paperRequestQueue(admin: User, q: z.infer<typeof moderationSchemas.queue>) {
    authorize(admin, { roles: ['admin'] });
    if (q.status && !['pending', 'fulfilled', 'dismissed'].includes(q.status)) fail(422, 'INVALID_STATUS', 'Invalid queue status');
    const id = cursorId(q.cursor);
    return page(await db.paperRequest.findMany({ where: { status: q.status, module: { programId: q.programId, program: { departmentId: q.departmentId } } }, include: { module: { select: { code: true, name: true, semester: true } }, requester: { select: { username: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.limit + 1, ...(id ? { cursor: { id }, skip: 1 } : {}) }), q.limit, r => ({ id: r.id, moduleId: r.moduleId, moduleCode: r.module.code, moduleName: r.module.name, semester: r.module.semester, category: r.category, testNumber: r.testNumber || null, academicYear: r.academicYearStart, wantsMarkingScheme: r.wantsMarkingScheme, description: r.description, requestedBy: r.requester?.username || null, status: r.status, reviewNote: r.reviewNote, createdAt: r.createdAt.toISOString() }));
}
export async function resolvePaperRequest(admin: User, id: string, input: z.infer<typeof moderationSchemas.resolvePaperRequest>) {
    authorize(admin, { roles: ['admin'] });
    return withTransactionRetry(async tx => {
        await adminCurrent(tx, admin.id);
        const request = await tx.paperRequest.findUnique({ where: { id } });
        if (!request) fail(404, 'NOT_FOUND', 'Request not found');
        if (request.status !== 'pending') {
            if (request.status === input.status) return { id, status: request.status };
            fail(409, 'ALREADY_REVIEWED', 'Request already reviewed');
        }
        if (input.status === 'fulfilled' && !await tx.paper.findFirst({ where: { moduleId: request.moduleId, category: request.category, testNumber: request.testNumber || null, academicYearStart: request.academicYearStart, ...publicPaper, ...(request.wantsMarkingScheme ? { markingSchemeFileId: { not: null } } : {}) }, select: { id: true } }))
            fail(409, 'PAPER_NOT_AVAILABLE', 'Approve a matching paper before marking this request fulfilled');
        await tx.paperRequest.update({ where: { id }, data: { status: input.status, reviewNote: input.note, reviewedByUserId: admin.id, reviewedAt: new Date() } });
        await audit(tx, admin.id, 'PAPER_REQUEST_' + input.status.toUpperCase(), 'paper_request', id, input.note);
        return { id, status: input.status };
    });
}
export async function queue(admin: User, kind: 'flags' | 'takedowns' | 'module-requests', q: z.infer<typeof moderationSchemas.queue>) {
    authorize(admin, { roles: ['admin'] });
    const id = cursorId(q.cursor), pagination = { take: q.limit + 1, orderBy: { id: 'desc' as const }, ...(id ? { cursor: { id }, skip: 1 } : {}) };
    const allowed = kind === 'flags' ? ['pending', 'resolved', 'dismissed'] : kind === 'takedowns' ? ['pending', 'approved_removed', 'rejected'] : ['pending', 'approved', 'rejected'];
    if (q.status && !allowed.includes(q.status))
        fail(422, 'INVALID_STATUS', 'Invalid queue status');
    if (kind === 'flags')
        return page(await db.flaggedReport.findMany({ where: { status: q.status }, ...pagination }), q.limit, r => ({ id: r.id, paperId: r.paperId, reason: r.reason, details: r.details, status: r.status, resolutionNote: r.resolutionNote, createdAt: r.createdAt.toISOString() }));
    if (kind === 'takedowns')
        return page(await db.takedownRequest.findMany({ where: { status: q.status }, ...pagination }), q.limit, r => ({ id: r.id, paperId: r.paperId, requesterFullName: r.requesterFullName, requesterEmail: r.requesterEmail, affiliation: r.affiliation, reason: r.reason, evidence: r.evidence, status: r.status, reviewNote: r.reviewNote, createdAt: r.createdAt.toISOString() }));
    return page(await db.moduleRequest.findMany({ where: { status: q.status, programId: q.programId, relatedProgramId: { departmentId: q.departmentId } }, ...pagination }), q.limit, r => ({ id: r.id, programId: r.programId, moduleCode: r.moduleCode, moduleName: r.moduleName, academicYear: r.academicYearStart, semester: r.semester, description: r.description, status: r.status, reviewNote: r.reviewNote, createdAt: r.createdAt.toISOString() }));
}
export async function resolveFlag(admin: User, id: string, input: z.infer<typeof moderationSchemas.resolveFlag>) { authorize(admin, { roles: ['admin'] }); return withTransactionRetry(async (tx) => { await adminCurrent(tx, admin.id); const r = await tx.flaggedReport.findUnique({ where: { id } }); if (!r)
    fail(404, 'NOT_FOUND', 'Report not found'); if (r.status !== 'pending') {
    if (r.status === input.status)
        return { id, status: r.status };
    fail(409, 'ALREADY_REVIEWED', 'Report already reviewed');
} await tx.flaggedReport.update({ where: { id }, data: { status: input.status, resolutionNote: input.note, resolvedByUserId: admin.id, resolvedAt: new Date() } }); await audit(tx, admin.id, 'FLAG_' + input.status.toUpperCase(), 'flag', id, input.note); return { id, status: input.status }; }); }
export async function resolveTakedown(admin: User, id: string, input: z.infer<typeof moderationSchemas.resolveTakedown>) {
    authorize(admin, { roles: ['admin'] });
    const result = await withTransactionRetry(async (tx) => { await adminCurrent(tx, admin.id); const r = await tx.takedownRequest.findUnique({ where: { id } }); if (!r)
        fail(404, 'NOT_FOUND', 'Request not found'); if (r.status !== 'pending') {
        if (r.status === input.status)
            return { id, status: r.status, files: [] as string[] };
        fail(409, 'ALREADY_REVIEWED', 'Request already reviewed');
    } const p = await lockPaper(tx, r.paperId); if (input.status === 'approved_removed')
        await tx.paper.update({ where: { id: p.id }, data: { status: 'REJECTED', rejectionReason: input.note, reviewedAt: new Date(), reviewedByUserId: admin.id } }); await tx.takedownRequest.update({ where: { id }, data: { status: input.status, reviewNote: input.note, reviewedByUserId: admin.id, reviewedAt: new Date() } }); await audit(tx, admin.id, 'TAKEDOWN_' + input.status.toUpperCase(), 'takedown', id, input.note); if (input.status === 'approved_removed') {
        await tx.notification.create({ data: { userId: p.uploadedByUserId, title: 'Paper removed', type: 'paper_rejected', message: input.note, link: '/papers/' + p.id } });
        const review = await tx.paperReview.create({ data: { paperId: p.id, reviewerUserId: admin.id, action: 'rejected', reason: input.note } });
        await tx.job.create({ data: { type: 'review_effects', payload: { paperId: p.id, reviewId: review.id, action: 'rejected' } } });
    } return { id, status: input.status, files: input.status === 'approved_removed' ? [p.examFileId, ...(p.markingSchemeFileId ? [p.markingSchemeFileId] : [])] : [] }; });
    invalidateDownloads(...result.files);
    return { id: result.id, status: result.status };
}
export async function resolveModule(admin: User, id: string, input: z.infer<typeof moderationSchemas.resolveModule>) { authorize(admin, { roles: ['admin'] }); return withTransactionRetry(async (tx) => { await adminCurrent(tx, admin.id); const r = await tx.moduleRequest.findUnique({ where: { id } }); if (!r)
    fail(404, 'NOT_FOUND', 'Request not found'); if (r.status !== 'pending') {
    if (r.status === input.status)
        return { id, status: r.status };
    fail(409, 'ALREADY_REVIEWED', 'Request already reviewed');
} if (input.status === 'approved') {
    if (!await tx.program.findFirst({ where: { id: r.programId, ...activeProgram } }))
        fail(409, 'PROGRAM_INACTIVE', 'Program is inactive');
    await tx.module.create({ data: { programId: r.programId, code: r.moduleCode, codeNormalized: r.moduleCode.toLowerCase(), name: r.moduleName, nameNormalized: r.moduleName.toLowerCase(), semester: r.semester } });
} await tx.moduleRequest.update({ where: { id }, data: { status: input.status, reviewNote: input.note, reviewedByUserId: admin.id, reviewedAt: new Date() } }); await audit(tx, admin.id, 'MODULE_REQUEST_' + input.status.toUpperCase(), 'module_request', id, input.note); return { id, status: input.status }; }); }
