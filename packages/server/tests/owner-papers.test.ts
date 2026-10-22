import { it, expect, vi } from 'vitest';
import type { User } from '@epapers/database/client';
import { myPapers } from '@epapers/server/modules/uploads/service';
import { db } from '@epapers/database';
import { paperInclude } from '@epapers/server/modules/catalog/dto';
import { responseSchemas } from '../scripts/phase-openapi';

it('owner submissions include display metadata while retaining the owner filter and excluding private account fields', async () => {
  const owner = { id: crypto.randomUUID(), role: 'CONTRIBUTOR', status: 'ACTIVE', deletedAt: null } as User;
  const department = { id: crypto.randomUUID(), name: 'Computing', code: 'CST', description: '', icon: 'Building2' };
  const program = { id: crypto.randomUUID(), departmentId: department.id, name: 'Computing', code: 'BCS', level: 'BACHELOR', campus: 'MAIN', awardTitle: 'BSc', department };
  const module = { id: crypto.randomUUID(), programId: program.id, name: 'Computing', code: 'COE07201', semester: 1, levelYear: 2, credits: 10, program };
  const row = { id: crypto.randomUUID(), title: 'Pending paper', category: 'UE', academicYearStart: 2024, semester: 1, examPeriod: 'UE',
    module, uploader: { ...owner, username: 'owner', avatarId: null, xp: 50, lecturerVerifiedAt: null, email: 'private@example.com', passwordHash: 'secret' },
    examFile: { scanStatus: 'PENDING', publishedAt: null }, markingSchemeFileId: null, pageCount: null, downloadsCount: 0n, viewsCount: 0n,
    createdAt: new Date(), status: 'PENDING', rejectionReason: null, duplicateWarning: false };
  const read = vi.spyOn(db.paper, 'findMany').mockResolvedValue([row] as never);
  try {
    const result = await myPapers(owner, { limit: 25 });
    expect(read).toHaveBeenCalledWith(expect.objectContaining({ where: { uploadedByUserId: owner.id }, include: paperInclude }));
    expect(responseSchemas.ownPaperPage.parse(result).items[0]).toMatchObject({ status: 'pending', module: { id: module.id }, department: { id: department.id }, downloadAvailable: false });
    const encoded = JSON.stringify(result);
    expect(encoded).not.toContain('private@example.com'); expect(encoded).not.toContain('passwordHash');
  } finally { read.mockRestore(); }
});
