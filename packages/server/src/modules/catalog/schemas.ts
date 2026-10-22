import 'server-only';
import { z } from 'zod';
export const uuid = z.string().uuid();
export const empty = z.strictObject({});
export const pagination = { cursor: z.string().max(512).optional(), limit: z.coerce.number().int().min(1).max(100).default(25) };
export const catalogSchemas = {
    departments: z.strictObject(pagination),
    programs: z.strictObject({ ...pagination, departmentId: uuid.optional(), level: z.enum(['ORDINARY_DIPLOMA', 'BACHELOR']).optional() }),
    modules: z.strictObject({ ...pagination, departmentId: uuid.optional(), programId: uuid.optional(), semester: z.coerce.number().int().min(1).max(2).optional() }),
    papers: z.strictObject({ ...pagination, q: z.string().trim().max(120).optional(), departmentId: uuid.optional(), programId: uuid.optional(), moduleId: uuid.optional(), category: z.enum(['TEST', 'UE', 'SUPP']).optional(), academicYear: z.coerce.number().int().min(2000).max(2200).optional(), semester: z.coerce.number().int().min(1).max(2).optional(), hasMarkingScheme: z.enum(['true', 'false']).optional(), sortBy: z.enum(['recent', 'popular', 'year_desc', 'year_asc']).default('recent') }),
};
export type PaperQuery = z.infer<typeof catalogSchemas.papers>;
