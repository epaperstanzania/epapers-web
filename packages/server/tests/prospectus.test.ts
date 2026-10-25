import { describe, expect, it } from 'vitest';
import curriculum from '../../database/prisma/seed/curriculum-v2.json';
import prospectus from '../../database/prisma/seed/prospectus-2026-2027.json';

describe('2026/27 DIT prospectus import', () => {
  it('links every extracted module to a seeded program without duplicate codes inside that program', () => {
    const programs = new Set(curriculum.programs.map(program => program.code));
    const keys = prospectus.modules.map(module => `${module.programCode}:${module.code}`);
    expect(prospectus.modules).toHaveLength(1241);
    expect(new Set(keys).size).toBe(keys.length);
    expect(prospectus.modules.every(module => programs.has(module.programCode))).toBe(true);
    expect(prospectus.modules.every(module => module.levelYear >= 1 && module.levelYear <= 8 && [1, 2].includes(module.semester))).toBe(true);
    expect(prospectus.modules.every(module => !/industrial practical training/i.test(module.name))).toBe(true);
  });

  it('places consecutive semester pairs in the same program year', () => {
    const find = (programCode: string, code: string) => prospectus.modules.find(module => module.programCode === programCode && module.code === code);
    expect(find('BENGCOE', 'COU07101')).toMatchObject({ levelYear: 1, semester: 1 });
    expect(find('BENGCOE', 'COU07201')).toMatchObject({ levelYear: 1, semester: 2 });
    expect(find('BENGCOE', 'COU07301')).toMatchObject({ levelYear: 2, semester: 1 });
    expect(find('BENGCOE', 'COU07401')).toMatchObject({ levelYear: 2, semester: 2 });
    expect(find('BENGCOE', 'COU08101')).toMatchObject({ levelYear: 4, semester: 1 });
  });
});
