import 'server-only';
import { User } from '@epapers/database/client';
import { z } from 'zod';
import { db, withTransactionRetry, withRetry, withDeleted } from '@epapers/database';
import { authorize } from '@epapers/server/modules/auth/service';
import { fail } from '@epapers/config/errors';
import { adminSchemas } from '@epapers/server/modules/admin/schemas';
import { rawAdminGuard, adminGuard, requireProof, audit, AdminProof } from '@epapers/server/modules/admin/guard';
import { adminUser, verificationDto, announcementDto } from '@epapers/server/modules/admin/dto';
import { page, cursorId, activeDepartment } from '@epapers/server/modules/catalog/service';
import { invalidateDownloads } from '@epapers/server/lib/download-cache';
import { env } from '@epapers/config/server-env';
import { scrub } from '@epapers/server/lib/logger';
import { tokenHash } from '@epapers/auth/crypto';
import { rateLimit } from '@epapers/server/lib/rate-limit';
type List = {
    cursor?: string;
    limit: number;
};
export function paging(q: List) { const id = cursorId(q.cursor); return { orderBy: { id: 'desc' as const }, take: q.limit + 1, ...(id ? { cursor: { id }, skip: 1 } : {}) }; }
export async function users(admin: User, q: z.infer<typeof adminSchemas.list>) { authorize(admin, { roles: ['admin'] }); return page(await db.user.findMany({ where: { role: q.role, status: q.status, homeDepartmentId: q.departmentId, ...(q.q ? { OR: [{ usernameNormalized: { contains: q.q.toLowerCase() } }, { emailNormalized: { contains: q.q.toLowerCase() } }] } : {}) }, ...paging(q) }), q.limit, adminUser); }
export async function user(admin: User, id: string) { authorize(admin, { roles: ['admin'] }); const u = await db.user.findUnique({ where: { id } }); if (!u)
    fail(404, 'NOT_FOUND', 'User not found'); return adminUser(u); }
export async function manageUser(admin: User, id: string, input: z.infer<typeof adminSchemas.user>, proof?: AdminProof) {
    authorize(admin, { roles: ['admin'] });
    input = adminSchemas.user.parse(input);
    return withTransactionRetry(async (tx) => {
        await adminGuard(tx, admin, requireProof(proof));
        await tx.$queryRaw `SELECT id FROM users WHERE role='ADMIN' AND status='ACTIVE' AND deleted_at IS NULL ORDER BY id FOR UPDATE`;
        await tx.$queryRaw `SELECT id FROM users WHERE id=${id}::UUID FOR UPDATE`;
        const current = await tx.user.findUnique({ where: { id } });
        if (!current)
            fail(404, 'NOT_FOUND', 'User not found');
        if (id === admin.id && ((input.status && input.status !== 'ACTIVE') || (input.role && input.role !== 'ADMIN')))
            fail(409, 'SELF_LOCKOUT', 'Cannot remove your own administrative access');
        if (input.role === 'ADMIN' && !current.emailVerifiedAt)
            fail(409, 'EMAIL_UNVERIFIED', 'Admin promotion requires verified email');
        const role = input.role || current.role, departmentId = input.homeDepartmentId === undefined ? current.homeDepartmentId : input.homeDepartmentId;
        if (departmentId && !await tx.department.findFirst({ where: { id: departmentId, ...activeDepartment } }))
            fail(422, 'INVALID_DEPARTMENT', 'Choose an active department');
        if (input.lecturerVerified && (role !== 'LECTURER' || !departmentId || !current.emailVerifiedAt))
            fail(422, 'INVALID_LECTURER', 'Verification requires a lecturer with verified email and department');
        const departmentChanged = input.homeDepartmentId !== undefined && input.homeDepartmentId !== current.homeDepartmentId;
        const lecturerVerifiedAt = role !== 'LECTURER' || input.lecturerVerified === false || departmentChanged ? null : input.lecturerVerified ? new Date() : current.lecturerVerifiedAt;
        let increment = 0;
        if (input.grantXp) {
            const rewardKey = 'admin:' + input.grantXp.requestId, existing = await tx.xpLedger.findUnique({ where: { rewardKey } });
            if (existing && (existing.userId !== id || Number(existing.amount) !== input.grantXp.amount || existing.reason !== input.reason))
                fail(409, 'IDEMPOTENCY_CONFLICT', 'Grant identifier already used');
            if (!existing) {
                await tx.xpLedger.create({ data: { userId: id, amount: BigInt(input.grantXp.amount), eventType: 'ADMIN_ADJUSTMENT', reason: input.reason, rewardKey } });
                increment = input.grantXp.amount;
            }
        }
        const updated = await tx.user.update({ where: { id }, data: { status: input.status, role: input.role, homeDepartmentId: input.homeDepartmentId, lecturerVerifiedAt: input.lecturerVerified === true ? new Date() : lecturerVerifiedAt, xp: { increment }, allTimeXp: { increment } } });
        if (input.status || input.role || departmentChanged || input.lecturerVerified !== undefined)
            await tx.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        await audit(tx, admin.id, 'USER_UPDATED', 'user', id, input.reason);
        return adminUser(updated);
    });
}
export async function settings(admin: User) { authorize(admin, { roles: ['admin'] }); const rows = await db.appSetting.findMany({ where: { key: { in: ['usernameCooldownDays', 'retentionDays', 'lockdown', 'readOnly', 'bannerMessage'] } } }); return Object.fromEntries(rows.map(s => [s.key, s.value])); }
export async function updateSettings(admin: User, input: z.infer<typeof adminSchemas.settings>, proof?: AdminProof) { authorize(admin, { roles: ['admin'] }); input = adminSchemas.settings.parse(input); await withTransactionRetry(async (tx) => { await adminGuard(tx, admin, requireProof(proof)); for (const [key, value] of Object.entries(input)) {
    if (key === 'reason' || value === undefined)
        continue;
    await tx.appSetting.upsert({ where: { key }, create: { key, value, updatedByUserId: admin.id }, update: { value, updatedByUserId: admin.id, updatedAt: new Date() } });
} await audit(tx, admin.id, 'SETTINGS_UPDATED', 'settings', null, input.reason); }); return settings(admin); }
export async function publicSettings() { const s = await db.appSetting.findMany({ where: { key: { in: ['lockdown', 'readOnly', 'bannerMessage'] } } }); return { lockdown: s.find(v => v.key === 'lockdown')?.value === true, readOnly: s.find(v => v.key === 'readOnly')?.value === true, bannerMessage: String(s.find(v => v.key === 'bannerMessage')?.value || '') }; }
export async function security(admin: User) { authorize(admin, { roles: ['admin'] }); return { settings: await settings(admin), policy: { adminTotpRequired: true, reauthSeconds: 300, accessSeconds: 900, adminAccessSeconds: 300, refreshRotation: true, maxUploadBytes: env.MAX_UPLOAD_BYTES, dailyUploadQuota: env.DAILY_UPLOAD_QUOTA, publicSignedUrlSeconds: 600 }, recentEvents: (await db.auditLog.findMany({ where: { action: { in: ['ADMIN_REAUTH', 'USER_UPDATED', 'SETTINGS_UPDATED', 'ACCOUNT_DELETED'] } }, orderBy: { createdAt: 'desc' }, take: 25 })).map(a => ({ id: a.id, action: a.action, targetId: a.targetId, createdAt: a.createdAt.toISOString() })) }; }
export async function auditLogs(admin: User, q: z.infer<typeof adminSchemas.audit>) { authorize(admin, { roles: ['admin'] }); return page(await db.auditLog.findMany({ where: { actorUserId: q.actorUserId, targetId: q.targetId, targetType: q.targetType, action: q.action }, ...paging(q) }), q.limit, a => ({ id: a.id, actorUserId: a.actorUserId, action: a.action, targetType: a.targetType, targetId: a.targetId, reason: a.reason, metadata: scrub(a.metadata), createdAt: a.createdAt.toISOString() })); }
export async function stats(admin: User) { authorize(admin, { roles: ['admin'] }); const [pendingPapers, approvedPapers, usersCount, lecturers, pendingVerifications, flags, takedowns, moduleRequests, downloads] = await Promise.all([db.paper.count({ where: { status: 'PENDING' } }), db.paper.count({ where: { status: 'APPROVED' } }), db.user.count(), db.user.count({ where: { role: 'LECTURER' } }), db.lecturerVerification.count({ where: { status: 'pending' } }), db.flaggedReport.count({ where: { status: 'pending' } }), db.takedownRequest.count({ where: { status: 'pending' } }), db.moduleRequest.count({ where: { status: 'pending' } }), db.paper.aggregate({ _sum: { downloadsCount: true } })]); return { pendingPapers, approvedPapers, users: usersCount, lecturers, pendingVerifications, flags, takedowns, moduleRequests, downloads: Number(downloads._sum.downloadsCount || 0) }; }
export async function submitVerification(user: User, input: z.infer<typeof adminSchemas.verification>) { authorize(user, { roles: ['lecturer'], requireVerifiedEmail: true }); return withTransactionRetry(async (tx) => { const u = await tx.user.findUnique({ where: { id: user.id } }); if (!u)
    fail(401, 'UNAUTHORIZED', 'Authentication required'); authorize(u, { roles: ['lecturer'], requireVerifiedEmail: true }); if (u.lecturerVerifiedAt)
    fail(409, 'ALREADY_VERIFIED', 'Lecturer is already verified'); if (!await tx.department.findFirst({ where: { id: input.departmentId, ...activeDepartment } }))
    fail(422, 'INVALID_DEPARTMENT', 'Choose an active department'); return verificationDto(await tx.lecturerVerification.create({ data: { userId: user.id, departmentId: input.departmentId, evidence: input.evidence } })); }); }
export async function verifications(admin: User, q: z.infer<typeof adminSchemas.queue>) { authorize(admin, { roles: ['admin'] }); return page(await db.lecturerVerification.findMany({ where: { status: q.status }, ...paging(q) }), q.limit, verificationDto); }
export async function reviewVerification(admin: User, id: string, input: z.infer<typeof adminSchemas.verificationReview>, proof?: AdminProof) { authorize(admin, { roles: ['admin'] }); return withTransactionRetry(async (tx) => { await adminGuard(tx, admin, requireProof(proof)); const v = await tx.lecturerVerification.findUnique({ where: { id } }); if (!v)
    fail(404, 'NOT_FOUND', 'Verification not found'); if (v.status !== 'pending') {
    if (v.status === input.status)
        return verificationDto(v);
    fail(409, 'ALREADY_REVIEWED', 'Verification already reviewed');
} const u = await tx.user.findUnique({ where: { id: v.userId } }); if (!u || u.role !== 'LECTURER' || u.status !== 'ACTIVE' || !u.emailVerifiedAt)
    fail(409, 'ACCOUNT_INELIGIBLE', 'Lecturer account is not eligible'); if (input.status === 'approved') {
    if (!await tx.department.findFirst({ where: { id: v.departmentId, ...activeDepartment } }))
        fail(409, 'DEPARTMENT_INACTIVE', 'Department is inactive');
    await tx.user.update({ where: { id: u.id }, data: { lecturerVerifiedAt: new Date(), homeDepartmentId: v.departmentId } });
    await tx.userSession.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
} const updated = await tx.lecturerVerification.update({ where: { id }, data: { status: input.status, reviewNote: input.reason, reviewedByUserId: admin.id, reviewedAt: new Date() } }); await tx.notification.create({ data: { userId: u.id, title: 'Lecturer verification reviewed', type: 'system', message: input.reason } }); await audit(tx, admin.id, 'LECTURER_' + input.status.toUpperCase(), 'lecturer_verification', id, input.reason); return verificationDto(updated); }); }
export async function deletePaper(admin: User, id: string, reason: string, proof?: AdminProof) { authorize(admin, { roles: ['admin'] }); const p = await withTransactionRetry(async (tx) => { await adminGuard(tx, admin, requireProof(proof)); await tx.$queryRaw `SELECT id FROM papers WHERE id=${id}::UUID FOR UPDATE`; const p = await tx.paper.findUnique({ where: { id } }); if (!p)
    fail(404, 'NOT_FOUND', 'Paper not found'); await tx.paper.update({ where: { id }, data: { deletedAt: new Date(), deletedById: admin.id } }); await audit(tx, admin.id, 'PAPER_DELETED', 'paper', id, reason); return p; }); invalidateDownloads(p.examFileId, p.markingSchemeFileId); return { message: 'Paper deleted' }; }
export async function restorePaper(admin: User, id: string, reason: string, proof?: AdminProof) { authorize(admin, { roles: ['admin'] }); const checked = requireProof(proof); const raw = withDeleted(); const p = await withRetry(() => raw.$transaction(async (tx) => { await rawAdminGuard(tx, admin, checked); await tx.$queryRaw `SELECT id FROM papers WHERE id=${id}::UUID FOR UPDATE`; const p = await tx.paper.findUnique({ where: { id } }); if (!p || !p.deletedAt)
    fail(404, 'NOT_FOUND', 'Deleted paper not found'); const setting = await tx.appSetting.findUnique({ where: { key: 'retentionDays' } }); const days = Number(setting?.value || 90); if (p.purgeStartedAt || Date.now() - p.deletedAt.getTime() > days * 86400000)
    fail(409, 'RETENTION_EXPIRED', 'Paper retention expired'); if (!await tx.module.findFirst({ where: { id: p.moduleId, isActive: true, deletedAt: null, program: { isActive: true, deletedAt: null, department: { isActive: true, deletedAt: null } } } }))
    fail(409, 'MODULE_INACTIVE', 'Curriculum must be active before restoring'); await tx.paper.update({ where: { id }, data: { deletedAt: null, deletedById: null } }); await tx.auditLog.create({ data: { actorUserId: admin.id, action: 'PAPER_RESTORED', targetType: 'paper', targetId: id, reason } }); return p; }, { isolationLevel: 'Serializable', timeout: 20000 })); invalidateDownloads(p.examFileId, p.markingSchemeFileId); return { message: 'Paper restored' }; }
export async function announcements(admin: User, q: List) { authorize(admin, { roles: ['admin'] }); return page(await db.announcement.findMany(paging(q)), q.limit, announcementDto); }
export async function activeAnnouncements(q: List) { return page(await db.announcement.findMany({ where: { isActive: true, startsAt: { lte: new Date() }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, ...paging(q) }), q.limit, announcementDto); }
export async function saveAnnouncement(admin: User, input: z.infer<typeof adminSchemas.announcement> | z.infer<typeof adminSchemas.announcementPatch>, id?: string) { authorize(admin, { roles: ['admin'] });
    if (!id) await rateLimit('broadcast-create:' + admin.id, 10, 3600);
    const submission = !id ? adminSchemas.announcement.parse(input) : null;
    const fingerprint = submission ? tokenHash(JSON.stringify({ ...submission, requestId: undefined })) : '';
    return withTransactionRetry(async (tx) => { await adminGuard(tx, admin);
    if (submission?.requestId) {
        const receipt = await tx.job.findUnique({ where: { dedupeKey: 'broadcast_request:' + admin.id + ':' + submission.requestId } });
        if (receipt) {
            const payload = receipt.payload as { announcementId: string; fingerprint: string };
            if (payload.fingerprint !== fingerprint) fail(409, 'REQUEST_ID_REUSED', 'Use a new request ID for a different announcement');
            const existing = await tx.announcement.findUnique({ where: { id: payload.announcementId } });
            if (!existing) fail(409, 'ANNOUNCEMENT_UNAVAILABLE', 'Announcement is no longer available');
            return announcementDto(existing);
        }
    }
    const current = id ? await tx.announcement.findUnique({ where: { id } }) : null; if (id && !current)
    fail(404, 'NOT_FOUND', 'Announcement not found'); const startsAt = input.startsAt ? new Date(input.startsAt) : current?.startsAt, endsAt = input.endsAt === undefined ? current?.endsAt : input.endsAt ? new Date(input.endsAt) : null; if (endsAt && startsAt && endsAt <= startsAt)
    fail(422, 'INVALID_WINDOW', 'End must follow start'); let a; if (id)
    a = await tx.announcement.update({ where: { id }, data: { title: input.title, content: input.content, type: input.type, isActive: input.isActive, startsAt, endsAt } });
else {
    const v = adminSchemas.announcement.parse(input);
    a = await tx.announcement.create({ data: { title: v.title, content: v.content, type: v.type, isActive: v.isActive, startsAt: new Date(v.startsAt), endsAt: v.endsAt ? new Date(v.endsAt) : null, createdByUserId: admin.id } });
}
    if (a.isActive) {
        const dedupeKey = 'broadcast_batch:' + a.id + ':start';
        await tx.job.upsert({ where: { dedupeKey }, create: { dedupeKey, type: 'broadcast_notifications', runAt: a.startsAt, payload: { announcementId: a.id, sendEmail: submission?.sendEmail ?? false } }, update: {} });
    }
    if (submission?.requestId) await tx.job.create({ data: { dedupeKey: 'broadcast_request:' + admin.id + ':' + submission.requestId, type: 'broadcast_request', status: 'done', payload: { announcementId: a.id, fingerprint } } });
    await audit(tx, admin.id, id ? 'ANNOUNCEMENT_UPDATED' : 'ANNOUNCEMENT_CREATED', 'announcement', a.id, input.reason); return announcementDto(a); }); }
export async function deleteAnnouncement(admin: User, id: string, reason: string, proof?: AdminProof) { authorize(admin, { roles: ['admin'] }); await withTransactionRetry(async (tx) => { await adminGuard(tx, admin, requireProof(proof)); if (!await tx.announcement.findUnique({ where: { id } }))
    fail(404, 'NOT_FOUND', 'Announcement not found'); await tx.announcement.update({ where: { id }, data: { deletedAt: new Date(), deletedById: admin.id } }); await audit(tx, admin.id, 'ANNOUNCEMENT_DELETED', 'announcement', id, reason); }); return { message: 'Announcement deleted' }; }

export async function ownVerifications(user: User, q: z.infer<typeof adminSchemas.queue>) { authorize(user,{roles:['lecturer'],requireVerifiedEmail:true}); return page(await db.lecturerVerification.findMany({where:{userId:user.id,...(q.status?{status:q.status}:{})},...paging(q)}),q.limit,verificationDto); }
