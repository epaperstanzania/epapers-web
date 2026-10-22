import 'server-only';
import { User } from '@epapers/database/client';
import { z } from 'zod';
import { db, withTransactionRetry } from '@epapers/database';
import { authorize } from '@epapers/server/modules/auth/service';
import { fail } from '@epapers/config/errors';
import { adminSchemas } from '@epapers/server/modules/admin/schemas';
import { adminGuard, requireProof, audit, AdminProof } from '@epapers/server/modules/admin/guard';
import { departmentDto, programDto, moduleDto } from '@epapers/server/modules/catalog/dto';
import { activeDepartment, activeProgram, page } from '@epapers/server/modules/catalog/service';
import { paging } from '@epapers/server/modules/admin/service';
export async function structureList(admin: User, kind: 'departments' | 'programs' | 'modules', q: {
    limit: number;
    cursor?: string;
}) { authorize(admin, { roles: ['admin'] }); if (kind === 'departments')
    return page(await db.department.findMany(paging(q)), q.limit, d => ({ ...departmentDto(d), isActive: d.isActive })); if (kind === 'programs')
    return page(await db.program.findMany(paging(q)), q.limit, p => ({ ...programDto(p), isActive: p.isActive })); return page(await db.module.findMany(paging(q)), q.limit, m => ({ ...moduleDto(m), isActive: m.isActive })); }
export async function saveDepartment(admin: User, input: z.infer<typeof adminSchemas.department> | z.infer<typeof adminSchemas.departmentPatch>, id?: string) { authorize(admin, { roles: ['admin'] }); return withTransactionRetry(async (tx) => { await adminGuard(tx, admin); if (id && !await tx.department.findUnique({ where: { id } }))
    fail(404, 'NOT_FOUND', 'Department not found'); let d; if (id)
    d = await tx.department.update({ where: { id }, data: { code: input.code, codeNormalized: input.code?.toLowerCase(), name: input.name, description: input.description, icon: input.icon, isActive: input.isActive } });
else {
    const v = adminSchemas.department.parse(input);
    d = await tx.department.create({ data: { code: v.code, codeNormalized: v.code.toLowerCase(), name: v.name, description: v.description, icon: v.icon, isActive: v.isActive } });
} await audit(tx, admin.id, id ? 'DEPARTMENT_UPDATED' : 'DEPARTMENT_CREATED', 'department', d.id, input.reason); return { ...departmentDto(d), isActive: d.isActive }; }); }
export async function saveProgram(admin: User, input: z.infer<typeof adminSchemas.program> | z.infer<typeof adminSchemas.programPatch>, id?: string) { authorize(admin, { roles: ['admin'] }); return withTransactionRetry(async (tx) => { await adminGuard(tx, admin); const current = id ? await tx.program.findUnique({ where: { id } }) : null; if (id && !current)
    fail(404, 'NOT_FOUND', 'Program not found'); if (input.departmentId && !await tx.department.findFirst({ where: { id: input.departmentId, ...activeDepartment } }))
    fail(422, 'INVALID_DEPARTMENT', 'Choose an active department'); if (current && input.departmentId && input.departmentId !== current.departmentId) {
    const r = await tx.$queryRaw<Array<{
        count: bigint;
    }>> `SELECT count(*) AS count FROM modules WHERE program_id=${current.id}::UUID`;
    if (Number(r[0].count))
        fail(409, 'HAS_DEPENDENTS', 'Archive a program with retained modules instead of moving it');
} let p; if (id)
    p = await tx.program.update({ where: { id }, data: { departmentId: input.departmentId, code: input.code, codeNormalized: input.code?.toLowerCase(), name: input.name, level: input.level, campus: input.campus, awardTitle: input.awardTitle, isActive: input.isActive } });
else {
    const v = adminSchemas.program.parse(input);
    p = await tx.program.create({ data: { departmentId: v.departmentId, code: v.code, codeNormalized: v.code.toLowerCase(), name: v.name, level: v.level, campus: v.campus, awardTitle: v.awardTitle, isActive: v.isActive } });
} await audit(tx, admin.id, id ? 'PROGRAM_UPDATED' : 'PROGRAM_CREATED', 'program', p.id, input.reason); return { ...programDto(p), isActive: p.isActive }; }); }
export async function saveModule(admin: User, input: z.infer<typeof adminSchemas.module> | z.infer<typeof adminSchemas.modulePatch>, id?: string) { authorize(admin, { roles: ['admin'] }); return withTransactionRetry(async (tx) => { await adminGuard(tx, admin); const current = id ? await tx.module.findUnique({ where: { id } }) : null; if (id && !current)
    fail(404, 'NOT_FOUND', 'Module not found'); if (input.programId && !await tx.program.findFirst({ where: { id: input.programId, ...activeProgram } }))
    fail(422, 'INVALID_PROGRAM', 'Choose an active program'); if (current && ((input.programId && input.programId !== current.programId) || (input.semester && input.semester !== current.semester))) {
    const rows = await tx.$queryRaw<Array<{
        count: bigint;
    }>> `SELECT count(*) AS count FROM papers WHERE module_id=${current.id}::UUID`;
    if (Number(rows[0].count))
        fail(409, 'HAS_DEPENDENTS', 'A module with retained papers cannot change program or semester');
} let m; if (id)
    m = await tx.module.update({ where: { id }, data: { programId: input.programId, code: input.code, codeNormalized: input.code?.toLowerCase(), name: input.name, nameNormalized: input.name?.toLowerCase(), semester: input.semester, levelYear: input.levelYear, credits: input.credits, isActive: input.isActive } });
else {
    const v = adminSchemas.module.parse(input);
    m = await tx.module.create({ data: { programId: v.programId, code: v.code, codeNormalized: v.code.toLowerCase(), name: v.name, nameNormalized: v.name.toLowerCase(), semester: v.semester, levelYear: v.levelYear, credits: v.credits, isActive: v.isActive } });
} await audit(tx, admin.id, id ? 'MODULE_UPDATED' : 'MODULE_CREATED', 'module', m.id, input.reason); return { ...moduleDto(m), isActive: m.isActive }; }); }
export async function deleteStructure(admin: User, kind: 'departments' | 'programs' | 'modules', id: string, reason: string, proof?: AdminProof) {
    authorize(admin, { roles: ['admin'] });
    await withTransactionRetry(async (tx) => {
        await adminGuard(tx, admin, requireProof(proof));
        let count: bigint;
        const data = { deletedAt: new Date(), deletedById: admin.id };
        if (kind === 'departments') {
            if (!await tx.department.findUnique({ where: { id } }))
                fail(404, 'NOT_FOUND', 'Department not found');
            const r = await tx.$queryRaw<Array<{
                count: bigint;
            }>> `SELECT (SELECT count(*) FROM programs WHERE department_id=${id}::UUID)+(SELECT count(*) FROM users WHERE home_department_id=${id}::UUID)+(SELECT count(*) FROM lecturer_verifications WHERE department_id=${id}::UUID) AS count`;
            count = r[0].count;
            if (Number(count))
                fail(409, 'HAS_DEPENDENTS', 'Archive a department with dependents');
            await tx.department.update({ where: { id }, data });
        }
        else if (kind === 'programs') {
            if (!await tx.program.findUnique({ where: { id } }))
                fail(404, 'NOT_FOUND', 'Program not found');
            const r = await tx.$queryRaw<Array<{
                count: bigint;
            }>> `SELECT (SELECT count(*) FROM modules WHERE program_id=${id}::UUID)+(SELECT count(*) FROM module_requests WHERE program_id=${id}::UUID) AS count`;
            count = r[0].count;
            if (Number(count))
                fail(409, 'HAS_DEPENDENTS', 'Archive a program with dependents');
            await tx.program.update({ where: { id }, data });
        }
        else {
            if (!await tx.module.findUnique({ where: { id } }))
                fail(404, 'NOT_FOUND', 'Module not found');
            const r = await tx.$queryRaw<Array<{
                count: bigint;
            }>> `SELECT count(*) AS count FROM papers WHERE module_id=${id}::UUID`;
            count = r[0].count;
            if (Number(count))
                fail(409, 'HAS_DEPENDENTS', 'Archive a module with retained papers');
            await tx.module.update({ where: { id }, data });
        }
        await audit(tx, admin.id, 'STRUCTURE_DELETED', kind, id, reason);
    });
    return { message: 'Structure entry deleted' };
}
export function parseCsv(text: string) {
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false, closed = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                cell += c;
            continue;
        }
        if (c === '"') {
            if (cell || closed)
                fail(422, 'INVALID_CSV', 'Invalid quoting');
            quoted = true;
            continue;
        }
        if (c === ',' || c === '\n' || c === '\r') {
            row.push(cell.trim());
            cell = '';
            closed = false;
            if (c !== ',') {
                if (row.some(Boolean))
                    rows.push(row);
                row = [];
                if (c === '\r' && text[i + 1] === '\n')
                    i++;
            }
            continue;
        }
        if (closed && c !== ' ')
            fail(422, 'INVALID_CSV', 'Unexpected characters after a quoted field');
        cell += c;
    }
    if (quoted)
        fail(422, 'INVALID_CSV', 'Unclosed quoted field');
    row.push(cell.trim());
    if (row.some(Boolean))
        rows.push(row);
    if (rows[0]?.join(',') !== 'code,name,programCode,semester,levelYear,credits')
        fail(422, 'INVALID_CSV', 'Expected code,name,programCode,semester,levelYear,credits header');
    if (rows.length < 2 || rows.length > 51)
        fail(422, 'CSV_LIMIT', 'Provide between 1 and 50 module rows');
    return rows.slice(1);
}
export async function importModules(admin: User, input: z.infer<typeof adminSchemas.csv>) {
    authorize(admin, { roles: ['admin'] });
    const rows = parseCsv(input.csv);
    return withTransactionRetry(async (tx) => {
        await adminGuard(tx, admin);
        const programs = await tx.program.findMany({ where: { ...activeProgram, codeNormalized: { in: rows.map(r => (r[2] || '').toLowerCase()) } } });
        const errors: Array<{
            row: number;
            message: string;
        }> = [], validated: Array<z.infer<typeof adminSchemas.module>> = [];
        const codes = new Set<string>();
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i], program = programs.find(p => p.codeNormalized === (r[2] || '').toLowerCase());
            if (r.length !== 6 || !program) {
                errors.push({ row: i + 2, message: r.length !== 6 ? 'Expected six cells' : 'Active program code not found' });
                continue;
            }
            const result = adminSchemas.module.safeParse({ code: r[0], name: r[1], programId: program.id, semester: Number(r[3]), levelYear: r[4] ? Number(r[4]) : null, credits: r[5] ? Number(r[5]) : null, reason: input.reason });
            if (!result.success) {
                errors.push({ row: i + 2, message: 'Invalid module values' });
                continue;
            }
            const normalized = result.data.code.toLowerCase();
            if (codes.has(normalized)) {
                errors.push({ row: i + 2, message: 'Duplicate code in CSV' });
                continue;
            }
            codes.add(normalized);
            validated.push(result.data);
        }
        const existing = await tx.module.findMany({ where: { codeNormalized: { in: [...codes] } } });
        for (const m of existing)
            errors.push({ row: rows.findIndex(r => r[0]?.toLowerCase() === m.codeNormalized) + 2, message: 'Module code already exists' });
        if (errors.length) {
            if (!input.dryRun)
                fail(422, 'INVALID_CSV', 'CSV validation failed; run dryRun for row errors');
            return { dryRun: true, valid: false, importedCount: 0, rows: [], errors };
        }
        if (!input.dryRun) {
            await tx.module.createMany({ data: validated.map(v => ({ programId: v.programId, code: v.code, codeNormalized: v.code.toLowerCase(), name: v.name, nameNormalized: v.name.toLowerCase(), semester: v.semester, levelYear: v.levelYear, credits: v.credits, isActive: v.isActive })) });
            await audit(tx, admin.id, 'MODULES_IMPORTED', 'module', null, input.reason);
        }
        return { dryRun: input.dryRun, valid: true, importedCount: input.dryRun ? 0 : validated.length, rows: validated.map(v => ({ code: v.code, name: v.name, programId: v.programId, semester: v.semester })), errors: [] };
    });
}
