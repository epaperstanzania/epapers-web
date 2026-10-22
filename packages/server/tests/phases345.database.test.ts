import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, withTransactionRetry } from '@epapers/database';
import { storage } from '@epapers/server/lib/storage';
import { presign, complete, createPaper, download, view } from '@epapers/server/modules/uploads/service';
import { review, resolveTakedown, moduleRequest, resolveModule, queue, flag, takedown } from '@epapers/server/modules/moderation/service';
import { notifications, achievements, leaderboard, readNotification } from '@epapers/server/modules/gamification/service';
import { papers, modules, moduleDetail } from '@epapers/server/modules/catalog/service';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import { moderationSchemas } from '@epapers/server/modules/moderation/schemas';
import { scanFile, rollupEvents, cleanAbandoned } from '@epapers/server/jobs/files';
import { finalizeApproval, reviewEffects } from '@epapers/server/jobs/moderation';
import { env } from '@epapers/config/server-env';
const enabled = process.env.EPAPERS_DB_TESTS_ENABLED === 'true';
const prefix = 'p345_' + randomUUID().replaceAll('-', '').slice(0, 10);
const objects = new Map<string, Buffer>();
const users: string[] = [], files: string[] = [], paperIds: string[] = [], requestIds: string[] = [];
let contributor: Awaited<ReturnType<typeof db.user.create>>, admin: typeof contributor, lecturer: typeof contributor, module: Awaited<ReturnType<typeof db.module.create>>, otherModule: typeof module;
const pdf = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n%%EOF\n');
const key = (bucket: string, k: string) => bucket + '/' + k;
beforeAll(async () => {
    if (!enabled)
        return;
    vi.spyOn(storage, 'presign').mockResolvedValue('https://upload.invalid');
    vi.spyOn(storage, 'head').mockImplementation(async (b, k) => { const body = objects.get(key(b, k)); if (!body)
        throw new Error('Missing'); return { size: body.length, type: 'application/pdf', etag: 'mock-etag' }; });
    vi.spyOn(storage, 'range').mockImplementation(async (b, k) => Buffer.from(objects.get(key(b, k))!));
    vi.spyOn(storage, 'stream').mockImplementation(async (b, k) => { const body = objects.get(key(b, k)); if (!body)
        throw new Error('Missing'); return (async function* () { yield body; })(); });
    vi.spyOn(storage, 'copy').mockImplementation(async (sb, sk, b, k) => { const body = objects.get(key(sb, sk)); if (!body)
        throw new Error('Missing'); objects.set(key(b, k), body); });
    vi.spyOn(storage, 'delete').mockImplementation(async (b, k) => { objects.delete(key(b, k)); });
    vi.spyOn(storage, 'download').mockResolvedValue('https://download.invalid');
    const program = await db.program.findFirstOrThrow({ where: { isActive: true, deletedAt: null, department: { deletedAt: null, isActive: true } } });
    const second = await db.program.findFirstOrThrow({ where: { departmentId: { not: program.departmentId }, isActive: true } });
    await withTransactionRetry(async (tx) => {
        for (const role of ['CONTRIBUTOR', 'ADMIN', 'LECTURER'] as const) {
            const username = prefix + role.slice(0, 1).toLowerCase();
            const u = await tx.user.create({ data: { username, usernameNormalized: username, email: username + '@example.com', emailNormalized: username + '@example.com', fullName: 'Private Test Name', passwordHash: 'disabled-test-login', emailVerifiedAt: new Date(), role, homeDepartmentId: role === 'LECTURER' ? program.departmentId : null, lecturerVerifiedAt: role === 'LECTURER' ? new Date() : null } });
            users.push(u.id);
            if (role === 'CONTRIBUTOR')
                contributor = u;
            else if (role === 'ADMIN')
                admin = u;
            else
                lecturer = u;
        }
        module = await tx.module.create({ data: { programId: program.id, code: prefix + 'a', codeNormalized: prefix + 'a', name: 'Phase test module', nameNormalized: 'phase test module', semester: 1 } });
        otherModule = await tx.module.create({ data: { programId: second.id, code: prefix + 'b', codeNormalized: prefix + 'b', name: 'Other department', nameNormalized: 'other department', semester: 1 } });
    });
}, 60000);
async function upload(user = contributor, body = pdf) { const result = await presign(user, { filename: 'paper.pdf', contentType: 'application/pdf', sizeBytes: body.length }); files.push(result.uploadId); const f = await db.storedFile.findUniqueOrThrow({ where: { id: result.uploadId } }); objects.set(key(f.bucketName, f.objectKey), body); await complete(user, f.id); return f.id; }
async function submit(user = contributor, m = module, scheme = false) { const examUploadId = await upload(user), markingSchemeUploadId = scheme ? await upload(user) : undefined; const p = await createPaper(user, { moduleId: m.id, title: 'Phase test paper', category: 'UE', academicYear: 2024, semester: 1, examPeriod: 'June', examUploadId, markingSchemeUploadId }); paperIds.push(p.id); return { p, examUploadId, markingSchemeUploadId }; }
afterAll(async () => {
    if (enabled) {
        await withTransactionRetry(async (tx) => {
            const allFiles = await tx.storedFile.findMany({ where: { ownerUserId: { in: users } } });
            const reviews = await tx.paperReview.findMany({ where: { paperId: { in: paperIds } } });
            const jobs = await tx.job.findMany();
            const jobIds = jobs.filter(j => { const p = j.payload as {
                fileId?: string;
                paperId?: string;
                key?: string;
            }; return (p.fileId && allFiles.some(f => f.id === p.fileId)) || (p.paperId && paperIds.includes(p.paperId)) || (p.key && users.some(id => p.key!.includes(id))) || (j.dedupeKey && [...paperIds, ...reviews.map(r => r.id)].some(id => j.dedupeKey!.includes(id))); }).map(j => j.id);
            await tx.job.deleteMany({ where: { id: { in: jobIds } } });
            await tx.flaggedReport.deleteMany({ where: { paperId: { in: paperIds } } });
            await tx.takedownRequest.deleteMany({ where: { paperId: { in: paperIds } } });
            await tx.paperReview.deleteMany({ where: { paperId: { in: paperIds } } });
            await tx.paperViewEvent.deleteMany({ where: { paperId: { in: paperIds } } });
            await tx.paperDownloadEvent.deleteMany({ where: { paperId: { in: paperIds } } });
            await tx.xpLedger.deleteMany({ where: { userId: { in: users } } });
            await tx.notification.deleteMany({ where: { userId: { in: users } } });
            await tx.userAchievement.deleteMany({ where: { userId: { in: users } } });
            await tx.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: users } }, { targetId: { in: paperIds } }] } });
            await tx.moduleRequest.deleteMany({ where: { id: { in: requestIds } } });
            await tx.paper.deleteMany({ where: { id: { in: paperIds } } });
            await tx.storedFile.deleteMany({ where: { ownerUserId: { in: users } } });
            await tx.module.deleteMany({ where: { codeNormalized: { startsWith: prefix } } });
            await tx.user.deleteMany({ where: { id: { in: users } } });
        });
    }
    vi.restoreAllMocks();
    await db.$disconnect();
}, 60000);
describe.skipIf(!enabled)('Phases 3–5 real CockroachDB with isolated storage adapter', () => {
    it('requires owner completion and rejects invalid PDF files', async () => { const id = await upload(); await expect(complete(lecturer, id)).rejects.toThrow(); expect((await complete(contributor, id)).completed).toBe(true); const bad = await upload(contributor, Buffer.from('<html>%%EOF')); expect((await db.storedFile.findUniqueOrThrow({ where: { id: bad } })).scanStatus).toBe('REJECTED'); await expect(createPaper(contributor, { moduleId: module.id, title: 'Bad paper', category: 'UE', academicYear: 2024, semester: 1, examPeriod: '', examUploadId: bad })).rejects.toThrow(); }, 60000);
    it('submits duplicates as warnings and enforces lecturer department scope', async () => { const first = await submit(); expect(first.p.status).toBe('pending'); const second = await submit(); expect(second.p.duplicateWarning).toBe(true); const own = await submit(lecturer); expect(own.p.status).toBe('approved'); const cross = await submit(lecturer, otherModule); expect(cross.p.status).toBe('pending'); const q = await modules(catalogSchemas.modules.parse({ programId: module.programId, semester: 1 })); expect(q.items.every(m => m.programId === module.programId && m.semester === 1)).toBe(true); }, 60000);
    it('keeps files private before scans and atomically awards approval once', async () => {
        const { p, examUploadId, markingSchemeUploadId } = await submit(contributor, module, true);
        await expect(review(admin, p.id, { action: 'approved', reason: '' })).rejects.toThrow();
        await scanFile(examUploadId);
        await scanFile(markingSchemeUploadId!);
        await Promise.all([review(admin, p.id, { action: 'approved', reason: '' }), review(admin, p.id, { action: 'approved', reason: '' })]);
        expect((await db.user.findUniqueOrThrow({ where: { id: contributor.id } })).xp).toBe(80);
        expect(await db.xpLedger.count({ where: { paperId: p.id } })).toBe(2);
        expect(await db.paperReview.count({ where: { paperId: p.id } })).toBe(1);
        await expect(download(p.id, 'exam', 'ip-fixture')).rejects.toThrow();
        const rv = await db.paperReview.findFirstOrThrow({ where: { paperId: p.id } });
        await reviewEffects(p.id, rv.id);
        await reviewEffects(p.id, rv.id);
        expect(await db.job.count({ where: { dedupeKey: 'review_notice:' + rv.id } })).toBe(1);
        await finalizeApproval(p.id);
        await finalizeApproval(p.id);
        expect((await db.storedFile.findUniqueOrThrow({ where: { id: examUploadId } })).bucketName).toBe(env.R2_PUBLISHED_BUCKET);
        const data = await papers(catalogSchemas.papers.parse({ moduleId: module.id }));
        const json = JSON.stringify(data);
        for (const field of ['fullName', 'email', 'passwordHash', 'objectKey', '"xp"', '"status"'])
            expect(json).not.toContain(field);
        const detail = await moduleDetail(module.code.toUpperCase());
        expect(detail.id).toBe(module.id);
        expect((await achievements(contributor)).find(a => a.id === 'first-paper')?.unlockedAt).toBeTruthy();
    }, 60000);
    it('records every download and debounces views; rolls counts up exactly once', async () => {
        const p = await db.paper.findFirstOrThrow({ where: { id: { in: paperIds }, status: 'APPROVED', uploadedByUserId: contributor.id } });
        await download(p.id, 'exam', 'counter-ip');
        await download(p.id, 'exam', 'counter-ip');
        await view(p.id, 'counter-ip');
        await view(p.id, 'counter-ip');
        await Promise.all([rollupEvents(), rollupEvents()]);
        const after = await db.paper.findUniqueOrThrow({ where: { id: p.id } });
        expect(Number(after.downloadsCount)).toBe(2);
        expect(Number(after.viewsCount)).toBe(1);
    }, 60000);
    it('never reverses XP on takedown, blocks further downloads and restricts private notifications', async () => {
        const p = await db.paper.findFirstOrThrow({ where: { id: { in: paperIds }, status: 'APPROVED', uploadedByUserId: contributor.id } });
        const report = await flag({ paperId: p.id, reason: 'copyright', details: 'Test report' }, contributor);
        expect(report.status).toBe('pending');
        const r = await takedown({ paperId: p.id, requesterFullName: 'Private Requester', requesterEmail: 'requester@example.com', affiliation: 'Fixture', reason: 'Copyright fixture request', evidence: 'Test evidence' }, contributor);
        await expect(queue(contributor, 'takedowns', moderationSchemas.queue.parse({}))).rejects.toThrow();
        await resolveTakedown(admin, r.id, { status: 'approved_removed', note: 'Copyright removal fixture' });
        expect((await db.user.findUniqueOrThrow({ where: { id: contributor.id } })).xp).toBe(80);
        await expect(download(p.id, 'exam', 'counter-ip')).rejects.toThrow();
        const notes = await notifications(contributor, { limit: 100 });
        expect(JSON.stringify(notes)).not.toContain('"xp"');
        await expect(readNotification(lecturer, notes.items[0].id)).rejects.toThrow();
        await readNotification(contributor, notes.items[0].id);
    }, 60000);
    it('awards verified lecturer contributions once after clean scans and hides inactive ancestors', async () => {
        const { p, examUploadId } = await submit(lecturer);
        await review(admin,p.id,{action:'edited',reason:'',title:'Corrected before scanning'});
        expect((await db.user.findUniqueOrThrow({where:{id:lecturer.id}})).xp).toBe(0);
        await scanFile(examUploadId);
        await finalizeApproval(p.id);
        await finalizeApproval(p.id);
        expect((await db.user.findUniqueOrThrow({ where: { id: lecturer.id } })).xp).toBe(50);
        await withTransactionRetry(tx => tx.module.update({ where: { id: module.id }, data: { isActive: false } }));
        expect((await papers(catalogSchemas.papers.parse({ moduleId: module.id }))).items).toHaveLength(0);
        await expect(moduleDetail(module.code)).rejects.toThrow();
        await withTransactionRetry(tx => tx.module.update({ where: { id: module.id }, data: { isActive: true } }));
        const rejected = await submit();
        await review(admin, rejected.p.id, { action: 'marked_spam', reason: 'Spam fixture' });
        expect(await db.xpLedger.count({ where: { paperId: rejected.p.id } })).toBe(0);
    }, 60000);
    it('rejects unsafe PDFs in the worker without XP and queues a private notice', async () => {
        const body=Buffer.from('%PDF-1.7\n /JavaScript () \n%%EOF\n');
        const examUploadId=await upload(contributor,body);
        const p=await createPaper(contributor,{moduleId:module.id,title:'Unsafe scan fixture',category:'TEST',testNumber:1,academicYear:2024,semester:1,examPeriod:'Test 1',examUploadId});
        paperIds.push(p.id);
        await scanFile(examUploadId);await scanFile(examUploadId);
        const rejected=await db.paper.findUniqueOrThrow({where:{id:p.id}});
        expect(rejected.status).toBe('REJECTED');
        await review(admin,p.id,{action:'edited',reason:'',title:'Corrected rejected title'});
        expect((await db.paper.findUniqueOrThrow({where:{id:p.id}})).rejectionReason).toBe(rejected.rejectionReason);
        expect(await db.xpLedger.count({where:{paperId:p.id}})).toBe(0);
        expect(await db.job.count({where:{dedupeKey:'scan_rejection:'+p.id}})).toBe(1);
        const notice=await db.notification.findFirstOrThrow({where:{userId:contributor.id,link:'/papers/'+p.id}});
        expect(notice.message).not.toContain('XP');
    },60000);
    it('approves module requests atomically and excludes admins/inactive accounts from leaderboard', async () => {
        await expect(moduleRequest({ departmentId: lecturer.homeDepartmentId!, programId: otherModule.programId, moduleCode: prefix + 'new', moduleName: 'Requested module', academicYear: 2024, semester: 2, description: 'Fixture' })).rejects.toThrow();
        const r = await moduleRequest({ departmentId: lecturer.homeDepartmentId!, programId: module.programId, moduleCode: prefix + 'new', moduleName: 'Requested module', academicYear: 2024, semester: 2, description: 'Fixture' }, contributor);
        requestIds.push(r.id);
        await resolveModule(admin, r.id, { status: 'approved', note: 'Verified curriculum' });
        await resolveModule(admin, r.id, { status: 'approved', note: 'Verified curriculum' });
        expect(await db.module.count({ where: { codeNormalized: prefix + 'new' } })).toBe(1);
        const leaders = await leaderboard(contributor, moderationSchemas.leaderboard.parse({ limit: 100 }));
        expect(leaders.items.some(u => u.username === contributor.username && u.xp === 80)).toBe(true);
        expect(leaders.items.some(u => u.username === admin.username)).toBe(false);
        expect(JSON.stringify(leaders)).not.toContain('email');
        await withTransactionRetry(tx => tx.user.update({ where: { id: contributor.id }, data: { status: 'SUSPENDED' } }));
        expect((await leaderboard(lecturer, moderationSchemas.leaderboard.parse({ limit: 100 }))).items.some(u => u.username === contributor.username)).toBe(false);
    }, 60000);
    it('cleans only abandoned, uncompleted uploads', async () => { const id = randomUUID(); files.push(id); await withTransactionRetry(tx => tx.storedFile.create({ data: { id, ownerUserId: lecturer.id, bucketName: env.R2_INCOMING_BUCKET, objectKey: 'incoming/' + lecturer.id + '/' + id + '.pdf', originalFilename: 'abandoned.pdf', contentType: 'application/pdf', sizeBytes: 20, createdAt: new Date(Date.now() - 90000000) } })); await cleanAbandoned(); expect(await db.storedFile.findUnique({ where: { id } })).toBeNull(); }, 60000);
});
