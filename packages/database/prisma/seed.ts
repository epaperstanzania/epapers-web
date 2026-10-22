import { PrismaClient, ProgramLevel, Campus } from '@prisma/client';
import { withRetry } from '../src/retry';
import seed from './seed/curriculum-v2.json';
const db = new PrismaClient();
async function main() {
    for (const d of seed.departments) {
        const department = await withRetry(() => db.$transaction(async (tx) => {
            const existing = await tx.department.findFirst({ where: { codeNormalized: d.code.toLowerCase(), deletedAt: null } });
            return existing ?? tx.department.create({ data: { code: d.code, codeNormalized: d.code.toLowerCase(), name: d.name } });
        }));
        for (const p of seed.programs.filter(p => p.departmentCode === d.code)) {
            await withRetry(() => db.$transaction(async (tx) => {
                const matches = await tx.program.findMany({ where: { codeNormalized: { in: [p.code.toLowerCase(), p.legacyCode.toLowerCase()] }, deletedAt: null } });
                if (matches.length > 1) throw new Error('PROGRAM_CODE_CONFLICT');
                const existing = matches[0];
                if (existing && (existing.departmentId !== department.id || existing.campus !== p.campus || existing.level !== p.level)) throw new Error('PROGRAM_CODE_CONFLICT');
                if (existing && existing.code !== p.code)
                    await tx.program.update({ where: { id: existing.id }, data: { code: p.code, codeNormalized: p.code.toLowerCase() } });
                else if (!existing)
                    await tx.program.create({ data: { departmentId: department.id, code: p.code, codeNormalized: p.code.toLowerCase(), name: p.name, level: p.level as ProgramLevel, awardTitle: p.awardTitle, campus: p.campus as Campus } });
            }));
        }
    }
    console.info('DIT curriculum v2 seeded with program abbreviations; verify flagged department assignments before production. No users or modules seeded.');
}
main().catch((error) => { console.error('Seed failed:', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
