import 'server-only';
import { Department, Program, Module, Prisma } from '@epapers/database/client';
import { levelTitleForXp } from '@epapers/server/lib/levels';
export const paperInclude = { module: { include: { program: { include: { department: true } } } }, uploader: true, examFile: true, markingSchemeFile: true } satisfies Prisma.PaperInclude;
export type PaperRecord = Prisma.PaperGetPayload<{
    include: typeof paperInclude;
}>;
export function departmentDto(d: Department) { return { id: d.id, code: d.code, name: d.name, description: d.description, icon: d.icon }; }
export function programDto(p: Program) { return { id: p.id, departmentId: p.departmentId, code: p.code, name: p.name, level: p.level, campus: p.campus, awardTitle: p.awardTitle }; }
export function moduleDto(m: Module) { return { id: m.id, programId: m.programId, code: m.code, name: m.name, semester: m.semester, levelYear: m.levelYear, credits: m.credits === null ? null : Number(m.credits) }; }
export function paperDto(p: PaperRecord) {
    const visible = p.uploader.deletedAt === null && p.uploader.status === 'ACTIVE';
    return { id: p.id, title: p.title, category: p.category, testNumber: p.testNumber, academicYear: p.academicYearStart, semester: p.semester, examPeriod: p.examPeriod, module: moduleDto(p.module), program: programDto(p.module.program), department: departmentDto(p.module.program.department), uploader: visible ? { username: p.uploader.username, avatarId: p.uploader.avatarId, levelTitle: levelTitleForXp(p.uploader.xp), isLecturerVerified: !!p.uploader.lecturerVerifiedAt } : null, pageCount: p.pageCount, hasMarkingScheme: !!p.markingSchemeFileId, downloadAvailable: p.examFile.scanStatus === 'CLEAN' && !!p.examFile.publishedAt, viewsCount: Number(p.viewsCount), downloadsCount: Number(p.downloadsCount), createdAt: p.createdAt.toISOString() };
}
