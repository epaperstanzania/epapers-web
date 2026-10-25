import { PrismaClient, ProgramLevel, Campus } from '@prisma/client';
import { withRetry } from '../src/retry';
import seed from './seed/curriculum-v2.json';
import prospectus from './seed/prospectus-2026-2027.json';
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
  const programs = await db.program.findMany({ where: { deletedAt: null }, select: { id: true, codeNormalized: true } });
  const byCode = new Map(programs.map(program => [program.codeNormalized, program.id]));
  const missingPrograms = [...new Set(prospectus.modules.map(module => module.programCode.toLowerCase()))].filter(code => !byCode.has(code));
  if (missingPrograms.length) throw new Error(`Prospectus programs missing: ${missingPrograms.join(', ')}`);

  const removedTraining = await db.module.updateMany({
    where: { deletedAt: null, nameNormalized: { contains: 'industrial practical training', mode: 'insensitive' } },
    data: { isActive: false, deletedAt: new Date() },
  });
  const existing = await db.module.findMany({ where: { deletedAt: null }, select: { id: true, programId: true, codeNormalized: true, levelYear: true, semester: true } });
  const existingByKey = new Map(existing.map(module => [`${module.programId}:${module.codeNormalized}`, module]));
  const additions = prospectus.modules.filter(module => !existingByKey.has(`${byCode.get(module.programCode.toLowerCase())}:${module.code.toLowerCase()}`));
  let added = 0;
  for (let offset = 0; offset < additions.length; offset += 100) {
    const batch = additions.slice(offset, offset + 100);
    const result = await withRetry(() => db.module.createMany({
      data: batch.map(module => ({
        programId: byCode.get(module.programCode.toLowerCase())!,
        code: module.code,
        codeNormalized: module.code.toLowerCase(),
        name: module.name,
        nameNormalized: module.name.toLowerCase(),
        semester: module.semester,
        levelYear: module.levelYear,
        credits: module.credits,
      })),
      skipDuplicates: true,
    }));
    added += result.count;
  }
  // Existing records may already have papers; add the year only when absent.
  let yearsFilled = 0;
  for (const module of prospectus.modules) {
    const current = existingByKey.get(`${byCode.get(module.programCode.toLowerCase())}:${module.code.toLowerCase()}`);
    if (current?.levelYear == null && current?.semester === module.semester) {
      const result = await withRetry(() => db.module.updateMany({ where: { id: current.id, levelYear: null }, data: { levelYear: module.levelYear } }));
      yearsFilled += result.count;
    }
  }
  console.info(`DIT prospectus curriculum seeded: ${added} modules added, ${yearsFilled} existing years filled, ${removedTraining.count} Industrial Practical Training modules archived; ${prospectus.modules.length} source mappings.`);
}
main().catch((error) => { console.error('Seed failed:', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
