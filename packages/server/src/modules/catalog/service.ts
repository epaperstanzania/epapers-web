import 'server-only';
import { Prisma } from '@epapers/database/client';
import { db } from '@epapers/database';
import { fail } from '@epapers/config/errors';
import { catalogSchemas, PaperQuery, uuid } from '@epapers/server/modules/catalog/schemas';
import { z } from 'zod';
import { levelTitleForXp } from '@epapers/server/lib/levels';
import { departmentDto, programDto, moduleDto, paperDto, paperInclude } from '@epapers/server/modules/catalog/dto';
export const activeDepartment = { isActive: true, deletedAt: null };
export const activeProgram = { isActive: true, deletedAt: null, department: activeDepartment };
export const activeModule = { isActive: true, deletedAt: null, program: activeProgram };
export const publicPaper = { status: 'APPROVED' as const, deletedAt: null, module: activeModule };
const cursorSchema = z.strictObject({ id: uuid });
export function cursorId(cursor?: string) {
    if (!cursor)
        return undefined;
    try {
        return cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString())).id;
    }
    catch {
        return fail(422, 'INVALID_CURSOR', 'Invalid cursor');
    }
}
export function page<T extends {
    id: string;
}, R>(rows: T[], limit: number, dto: (row: T) => R) {
    const hasMore = rows.length > limit, items = rows.slice(0, limit);
    return { items: items.map(dto), nextCursor: hasMore ? Buffer.from(JSON.stringify({ id: items.at(-1)!.id })).toString('base64url') : null };
}
function seek(cursor?: string) { const id = cursorId(cursor); return id ? { cursor: { id }, skip: 1 } : {}; }
export async function departments(q: z.infer<typeof catalogSchemas.departments>) {
    const rows = await db.department.findMany({ where: activeDepartment, orderBy: { id: 'asc' }, take: q.limit + 1, ...seek(q.cursor) });
    const visible = rows.slice(0, q.limit);
    const counts = visible.length ? await db.$queryRaw<Array<{ id: string; programsCount: number; modulesCount: number; papersCount: number }>>`
        SELECT d.id,
          (SELECT count(*)::int FROM programs p WHERE p.department_id = d.id AND p.is_active AND p.deleted_at IS NULL) AS "programsCount",
          (SELECT count(*)::int FROM modules m JOIN programs p ON p.id = m.program_id
            WHERE p.department_id = d.id AND p.is_active AND p.deleted_at IS NULL AND m.is_active AND m.deleted_at IS NULL) AS "modulesCount",
          (SELECT count(*)::int FROM papers paper JOIN modules m ON m.id = paper.module_id JOIN programs p ON p.id = m.program_id
            WHERE p.department_id = d.id AND p.is_active AND p.deleted_at IS NULL AND m.is_active AND m.deleted_at IS NULL
              AND paper.status = 'APPROVED' AND paper.deleted_at IS NULL) AS "papersCount"
        FROM departments d WHERE d.id IN (${Prisma.join(visible.map(d => Prisma.sql`${d.id}::uuid`))})` : [];
    const byId = new Map(counts.map(count => [count.id, count]));
    return page(rows, q.limit, d => ({ ...departmentDto(d), programsCount: byId.get(d.id)?.programsCount ?? 0, modulesCount: byId.get(d.id)?.modulesCount ?? 0, papersCount: byId.get(d.id)?.papersCount ?? 0 }));
}
export async function programs(q: z.infer<typeof catalogSchemas.programs>) {
    const rows = await db.program.findMany({ where: { ...activeProgram, departmentId: q.departmentId, level: q.level }, include: { _count: { select: { modules: { where: { isActive: true, deletedAt: null } } } } }, orderBy: { id: 'asc' }, take: q.limit + 1, ...seek(q.cursor) });
    return page(rows, q.limit, p => ({ ...programDto(p), modulesCount: p._count.modules }));
}
export async function modules(q: z.infer<typeof catalogSchemas.modules>) { return page(await db.module.findMany({ where: { ...activeModule, programId: q.programId, semester: q.semester, program: { ...activeProgram, departmentId: q.departmentId } }, orderBy: q.programId ? [{ levelYear: 'asc' }, { semester: 'asc' }, { codeNormalized: 'asc' }, { id: 'asc' }] : [{ id: 'asc' }], take: q.limit + 1, ...seek(q.cursor) }), q.limit, moduleDto); }
export async function department(id: string) { const d = await db.department.findFirst({ where: { id, ...activeDepartment } }); if (!d)
    fail(404, 'NOT_FOUND', 'Department not found'); return departmentDto(d); }
export async function program(id: string) { const p = await db.program.findFirst({ where: { id, ...activeProgram } }); if (!p)
    fail(404, 'NOT_FOUND', 'Program not found'); return { ...programDto(p), modules: await modules(catalogSchemas.modules.parse({ programId: id })) }; }
export async function publicProfile(username: string) { const registry = await db.usernameRegistry.findUnique({ where: { usernameNormalized: username.toLowerCase() }, include: { relatedUserId: true } }); const user = registry?.relatedUserId; if (!user || user.deletedAt || user.status !== 'ACTIVE')
    fail(404, 'NOT_FOUND', 'User not found'); return { username: user.username, bio: user.bio, avatarId: user.avatarId, levelTitle: levelTitleForXp(user.xp), isLecturerVerified: !!user.lecturerVerifiedAt, joinedAt: user.joinedAt.toISOString() }; }
export async function moduleDetail(codeOrId: string) {
    const m = await db.module.findFirst({ where: { ...activeModule, ...(uuid.safeParse(codeOrId).success ? { id: codeOrId } : { codeNormalized: codeOrId.toLowerCase() }) } });
    if (!m)
        fail(404, 'NOT_FOUND', 'Module not found');
    return { ...moduleDto(m), papers: await papers(catalogSchemas.papers.parse({ moduleId: m.id })) };
}
export async function papers(q: PaperQuery) {
    const where: Prisma.PaperWhereInput = { ...publicPaper, moduleId: q.moduleId, category: q.category, testNumber: q.testNumber, academicYearStart: q.academicYear, semester: q.semester, ...(q.hasMarkingScheme ? { markingSchemeFileId: q.hasMarkingScheme === 'true' ? { not: null } : null } : {}), module: { ...activeModule, programId: q.programId, program: { ...activeProgram, departmentId: q.departmentId } } };
    if (q.q)
        where.OR = [{ title: { contains: q.q, mode: 'insensitive' } }, { module: { codeNormalized: { startsWith: q.q.toLowerCase() } } }, { module: { nameNormalized: { startsWith: q.q.toLowerCase() } } }];
    const orderBy: Prisma.PaperOrderByWithRelationInput[] = q.sortBy === 'popular' ? [{ downloadsCount: 'desc' }, { viewsCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] : q.sortBy.startsWith('year_') ? [{ academicYearStart: q.sortBy === 'year_asc' ? 'asc' : 'desc' }, { id: 'desc' }] : [{ createdAt: 'desc' }, { id: 'desc' }];
    return page(await db.paper.findMany({ where, orderBy, include: paperInclude, take: q.limit + 1, ...seek(q.cursor) }), q.limit, paperDto);
}
export async function paper(id: string) { const p = await db.paper.findFirst({ where: { id, ...publicPaper }, include: paperInclude }); if (!p)
    fail(404, 'NOT_FOUND', 'Paper not found'); return paperDto(p); }
