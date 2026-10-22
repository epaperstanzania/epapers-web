import { describe, expect, it } from 'vitest';
import current from '../../database/prisma/seed/curriculum-v2.json';
import legacy from '../../database/prisma/seed/curriculum-v1.json';

describe('DIT program abbreviations', () => {
    it('retains every existing program, campus and department mapping for an in-place upgrade', () => {
        expect(current.programs).toHaveLength(legacy.programs.length);
        expect(new Set(current.programs.map(p => p.code.toLowerCase())).size).toBe(current.programs.length);
        for (const previous of legacy.programs) {
            const next = current.programs.find(p => p.legacyCode === previous.code);
            expect(next).toMatchObject({ name: previous.name, departmentCode: previous.departmentCode, level: previous.level, campus: previous.campus });
        }
    });
    it('uses the requested degree and diploma codes exactly', () => {
        const codes = ['BENGME', 'BENGCE', 'BENGCOE', 'BENGEE', 'BENGETE', 'BENGOGE', 'BENGMINE', 'BENGBME', 'BTECHLS', 'ODME', 'ODCE', 'ODCOE', 'ODEE', 'ODETE', 'ODIT', 'ODERE', 'ODBME', 'ODSLT', 'ODMINE', 'ODCST', 'ODMFT', 'ODIAE'];
        for (const code of codes) expect(current.programs.some(p => p.code === code)).toBe(true);
        expect(current.programs.find(p => p.code === 'BENGME')?.name).toContain('Mechanical Engineering');
        expect(current.programs.find(p => p.code === 'ODIT')?.name).toContain('Information Technology');
    });
    it('keeps multi-campus program identities distinct', () => {
        for (const [base, other, campus] of [['ODCE', 'ODCE-SONGWE', 'SONGWE'], ['ODSLT', 'ODSLT-MWANZA', 'MWANZA'], ['BTECHLS', 'BTECHLS-MWANZA', 'MWANZA']]) {
            const main = current.programs.find(p => p.code === base), branch = current.programs.find(p => p.code === other);
            expect(main?.campus).toBe('MAIN'); expect(branch?.campus).toBe(campus); expect(branch?.name).toBe(main?.name);
        }
    });
});
