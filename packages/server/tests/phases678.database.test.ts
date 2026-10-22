import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, withDeleted } from '@epapers/database';
import { signReauthentication } from '@epapers/auth/jwt';
import { hashPassword } from '@epapers/auth/crypto';
import { storage } from '@epapers/server/lib/storage';
import * as adminService from '@epapers/server/modules/admin/service';
import * as structure from '@epapers/server/modules/admin/structure';
import { adminSchemas } from '@epapers/server/modules/admin/schemas';
import { exportAccount, deleteAccount } from '@epapers/server/modules/accounts/service';
import { purgeExpiredPapers } from '@epapers/server/jobs/retention';
import type { User } from '@epapers/database/client';
const enabled = process.env.EPAPERS_DB_TESTS_ENABLED === 'true';
const prefix = 'p678_' + randomUUID().replaceAll('-', '').slice(0, 10), raw = withDeleted();
const ids: string[] = [], papers: string[] = [], fileIds: string[] = [], departmentIds: string[] = [], programIds: string[] = [], moduleIds: string[] = [], announcementIds: string[] = [];
let admin: User, contributor: User, lecturer: User, sessionId: string, token: string;
const proof = () => ({ token, sessionId });
const password = 'A distinctive integration password 678!';
beforeAll(async () => {
    if (!enabled)
        return;
    const passwordHash = await hashPassword(password);
    for (const role of ['ADMIN', 'CONTRIBUTOR', 'LECTURER'] as const) {
        const username = prefix + role[0].toLowerCase();
        const u = await db.user.create({ data: { username, usernameNormalized: username, email: username + '@example.com', emailNormalized: username + '@example.com', fullName: 'Sensitive Test Name', passwordHash, emailVerifiedAt: new Date(), role } });
        ids.push(u.id);
        if (role === 'ADMIN')
            admin = u;
        else if (role === 'CONTRIBUTOR')
            contributor = u;
        else
            lecturer = u;
    }
    const s = await db.userSession.create({ data: { userId: admin.id, adminEmailVerifiedAt: new Date(), refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
    sessionId = s.id;
    token = await signReauthentication(admin.id, s.id);
    vi.spyOn(storage, 'delete').mockResolvedValue(undefined);
}, 60000);
afterAll(async () => {
    if (enabled) {
        await raw.$transaction(async (tx) => {
            await tx.lecturerVerification.deleteMany({ where: { userId: { in: ids } } });
            await tx.notification.deleteMany({ where: { userId: { in: ids } } });
            await tx.userSession.deleteMany({ where: { userId: { in: ids } } });
            await tx.announcement.deleteMany({where:{id:{in:announcementIds}}});
            await tx.paperReview.deleteMany({ where: { paperId: { in: papers } } });
            await tx.paperDownloadEvent.deleteMany({ where: { paperId: { in: papers } } });
            await tx.paperViewEvent.deleteMany({ where: { paperId: { in: papers } } });
            await tx.xpLedger.deleteMany({ where: { userId: { in: ids } } });
            await tx.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: ids } }, { targetId: { in: [...papers, ...departmentIds, ...programIds, ...moduleIds] } }] } });
            await tx.paper.deleteMany({ where: { id: { in: papers } } });
            await tx.storedFile.deleteMany({ where: { id: { in: fileIds } } });
            await tx.module.deleteMany({ where: { OR: [{ id: { in: moduleIds } }, { codeNormalized: { startsWith: prefix } }] } });
            await tx.user.deleteMany({ where: { id: { in: ids } } });
            await tx.program.deleteMany({ where: { id: { in: programIds } } });
            await tx.department.deleteMany({ where: { id: { in: departmentIds } } });
        }, { timeout: 20000 });
    }
    vi.restoreAllMocks();
    await db.$disconnect();
    await raw.$disconnect();
}, 60000);
describe.skipIf(!enabled)('Phases 6–8 real CockroachDB administration and retention', () => {
    it('publishes announcements only within their window and preserves absent patch values',async()=>{
        const visible=await adminService.saveAnnouncement(admin,adminSchemas.announcement.parse({title:'Visible '+prefix,content:'Campus notice',startsAt:new Date(Date.now()-60000).toISOString(),reason:'test'}));announcementIds.push(visible.id);
        const expired=await adminService.saveAnnouncement(admin,adminSchemas.announcement.parse({title:'Expired '+prefix,content:'Old notice',startsAt:new Date(Date.now()-120000).toISOString(),endsAt:new Date(Date.now()-60000).toISOString(),reason:'test'}));announcementIds.push(expired.id);
        const updated=await adminService.saveAnnouncement(admin,adminSchemas.announcementPatch.parse({title:'Renamed '+prefix,reason:'test'}),expired.id);expect(updated.endsAt).toBe(expired.endsAt);expect(updated.startsAt).toBe(expired.startsAt);
        const publicRows=await adminService.activeAnnouncements({limit:100});expect(publicRows.items.some(a=>a.id===visible.id)).toBe(true);expect(publicRows.items.some(a=>a.id===expired.id)).toBe(false);
    },60000);
    it('rejects non-admin access and missing or mismatched reauthentication', async () => {
        await expect(adminService.users(contributor, adminSchemas.list.parse({}))).rejects.toThrow();
        const input = adminSchemas.user.parse({ grantXp: { amount: 10, requestId: randomUUID() }, reason: 'test' });
        await expect(adminService.manageUser(admin, contributor.id, input)).rejects.toThrow('Reauthentication');
        await expect(adminService.manageUser(admin, contributor.id, input, { token, sessionId: randomUUID() })).rejects.toThrow('Reauthentication');
    }, 30000);
    it('grants positive XP once and revokes suspended account sessions', async () => {
        const input = adminSchemas.user.parse({ grantXp: { amount: 15, requestId: randomUUID() }, reason: 'Administrative award' });
        await adminService.manageUser(admin, contributor.id, input, proof());
        await adminService.manageUser(admin, contributor.id, input, proof());
        expect((await db.user.findUniqueOrThrow({ where: { id: contributor.id } })).xp).toBe(15);
        expect(await db.xpLedger.count({ where: { userId: contributor.id } })).toBe(1);
        const session = await db.userSession.create({ data: { userId: contributor.id, refreshTokenHash: randomUUID(), familyId: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
        await adminService.manageUser(admin, contributor.id, adminSchemas.user.parse({ status: 'SUSPENDED', reason: 'Policy enforcement' }), proof());
        expect((await db.userSession.findUniqueOrThrow({ where: { id: session.id } })).revokedAt).not.toBeNull();
        await adminService.manageUser(admin, contributor.id, adminSchemas.user.parse({ status: 'ACTIVE', reason: 'Resolved' }), proof());
        await expect(adminService.manageUser(admin, admin.id, adminSchemas.user.parse({ role: 'CONTRIBUTOR', reason: 'test' }), proof())).rejects.toThrow('own administrative');
    }, 60000);
    it('imports CSV atomically, preserves quoted names, and blocks dependent deletion', async () => {
        const d = await structure.saveDepartment(admin, adminSchemas.department.parse({ code: prefix, name: 'Integration department', reason: 'test' }));
        departmentIds.push(d.id);
        const p = await structure.saveProgram(admin, adminSchemas.program.parse({ departmentId: d.id, code: prefix + 'p', name: 'Integration program', level: 'BACHELOR', awardTitle: 'Bachelor degree', reason: 'test' }));
        programIds.push(p.id);
        const csv = `code,name,programCode,semester,levelYear,credits\n${prefix}m,"Networks, advanced",${p.code},1,2,4`;
        const dry = await structure.importModules(admin, { csv, dryRun: true, reason: 'test' });
        expect(dry.valid).toBe(true);
        expect(dry.importedCount).toBe(0);
        expect(await db.module.count({ where: { programId: p.id } })).toBe(0);
        expect((await structure.importModules(admin, { csv, dryRun: false, reason: 'test' })).importedCount).toBe(1);
        const m = await db.module.findFirstOrThrow({ where: { programId: p.id } });
        moduleIds.push(m.id);
        expect(m.name).toBe('Networks, advanced');
        await expect(structure.deleteStructure(admin, 'programs', p.id, 'test', proof())).rejects.toThrow('Archive');
        await expect(structure.importModules(admin, { csv: csv + `\n${prefix}bad,Bad,missing,2,,`, dryRun: false, reason: 'test' })).rejects.toThrow('CSV validation');
        expect(await db.module.count({ where: { programId: p.id } })).toBe(1);
    }, 60000);
    it('verifies lecturers only through the current eligible account and department', async () => {
        const request = await adminService.submitVerification(lecturer, { departmentId: departmentIds[0], evidence: 'Institutional appointment evidence' });
        await adminService.reviewVerification(admin, request.id, { status: 'approved', reason: 'Appointment checked' }, proof());
        const u = await db.user.findUniqueOrThrow({ where: { id: lecturer.id } });
        expect(u.lecturerVerifiedAt).not.toBeNull();
        expect(u.homeDepartmentId).toBe(departmentIds[0]);
        await expect(adminService.submitVerification(u, { departmentId: departmentIds[0], evidence: 'Institutional appointment evidence' })).rejects.toThrow('already verified');
    }, 60000);
    it('restores retained papers and purges expired objects without reversing XP', async () => {
        const file = await db.storedFile.create({ data: { ownerUserId: contributor.id, bucketName: 'test-private', objectKey: prefix + '/paper.pdf', originalFilename: 'paper.pdf', contentType: 'application/pdf', sizeBytes: 20n, scanStatus: 'CLEAN', completedAt: new Date(), publishedAt: new Date() } });
        fileIds.push(file.id);
        const p = await db.paper.create({ data: { moduleId: moduleIds[0], uploadedByUserId: contributor.id, examFileId: file.id, title: 'Retention test', category: 'UE', academicYearStart: 2025, semester: 1, status: 'APPROVED' } });
        papers.push(p.id);
        await db.xpLedger.create({ data: { userId: contributor.id, paperId: p.id, amount: 50n, eventType: 'APPROVED_PAPER', reason: 'Retention fixture', rewardKey: prefix + 'retention' } });
        await db.user.update({ where: { id: contributor.id }, data: { xp: { increment: 50 }, allTimeXp: { increment: 50 } } });
        await adminService.deletePaper(admin, p.id, 'Retention test', proof());
        expect(await db.paper.findUnique({ where: { id: p.id } })).toBeNull();
        await adminService.restorePaper(admin, p.id, 'Restore test', proof());
        expect(await db.paper.findUnique({ where: { id: p.id } })).not.toBeNull();
        await adminService.deletePaper(admin, p.id, 'Expire test', proof());
        await raw.paper.update({ where: { id: p.id }, data: { deletedAt: new Date('2000-01-01') } });
        await expect(adminService.restorePaper(admin, p.id, 'test', proof())).rejects.toThrow('retention expired');
        vi.mocked(storage.delete).mockRejectedValueOnce(new Error('storage unavailable'));
        await expect(purgeExpiredPapers()).rejects.toThrow('storage unavailable');
        expect((await raw.paper.findUniqueOrThrow({ where: { id: p.id } })).purgeStartedAt).not.toBeNull();
        await purgeExpiredPapers();
        expect(await raw.paper.findUnique({ where: { id: p.id } })).toBeNull();
        const ledger = await db.xpLedger.findUniqueOrThrow({ where: { rewardKey: prefix + 'retention' } });
        expect(ledger.paperId).toBeNull();
        expect(ledger.amount).toBe(50n);
        expect((await db.user.findUniqueOrThrow({ where: { id: contributor.id } })).xp).toBe(65);
    }, 60000);
    it('exports safe cursor pages and anonymizes account data while preserving awards', async () => {
        for (let i = 0; i < 3; i++)
            await db.notification.create({ data: { userId: contributor.id, title: 'Test ' + i, type: 'system', message: 'Private message' } });
        const first = await exportAccount(contributor, { limit: 2 });
        expect(first.notifications.items).toHaveLength(2);
        expect(first.notifications.nextCursor).not.toBeNull();
        const last = await exportAccount(contributor, { limit: 2, notificationCursor: first.notifications.nextCursor! });
        expect(last.notifications.items).toHaveLength(1);
        expect(JSON.stringify(first)).not.toMatch(/passwordHash|totpSecret|allTimeXp|"xp"/);
        await deleteAccount(contributor, password);
        expect(await db.user.findUnique({ where: { id: contributor.id } })).toBeNull();
        const deleted = await raw.user.findUniqueOrThrow({ where: { id: contributor.id } });
        expect(deleted.fullName).toBe('Deleted account');
        expect(deleted.email).toContain('@deleted.invalid');
        expect(deleted.xp).toBe(65);
        expect(await db.notification.count({ where: { userId: contributor.id } })).toBe(0);
    }, 60000);
});
