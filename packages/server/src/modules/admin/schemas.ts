import 'server-only';
import { z } from 'zod';
import { uuid, pagination } from '@epapers/server/modules/catalog/schemas';
const reason = z.string().trim().min(1).max(2000);
const code = z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/);
const change = <T extends z.ZodRawShape>(shape: T) => z.strictObject({ ...shape, reason }).refine(v => Object.keys(v).length > 1, 'Choose at least one change');
const department = { code: code.max(20), name: z.string().trim().min(2).max(160), description: z.string().max(2000).default(''), icon: z.string().max(40).default('Building2'), isActive: z.boolean().default(true) };
const program = { departmentId: uuid, code, name: z.string().trim().min(2).max(200), level: z.enum(['ORDINARY_DIPLOMA', 'BACHELOR']), campus: z.enum(['MAIN', 'MWANZA', 'SONGWE']).default('MAIN'), awardTitle: z.string().trim().min(2).max(200), isActive: z.boolean().default(true) };
const module = { programId: uuid, code, name: z.string().trim().min(2).max(240), semester: z.number().int().min(1).max(2), levelYear: z.number().int().min(1).max(8).nullable().optional(), credits: z.number().min(0).max(999).nullable().optional(), isActive: z.boolean().default(true) };
const announcement = { title: z.string().trim().min(2).max(240), content: z.string().trim().min(1).max(8000), type: z.enum(['info', 'warning', 'alert', 'success']).default('info'), isActive: z.boolean().default(true), startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable().optional() };
export const adminSchemas = {
    reason: z.strictObject({ reason }),
    list: z.strictObject({ ...pagination, q: z.string().trim().max(120).optional(), role: z.enum(['CONTRIBUTOR', 'LECTURER', 'ADMIN']).optional(), status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(), departmentId: uuid.optional() }),
    user: change({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(), role: z.enum(['CONTRIBUTOR', 'LECTURER', 'ADMIN']).optional(), homeDepartmentId: uuid.nullable().optional(), lecturerVerified: z.boolean().optional(), grantXp: z.strictObject({ amount: z.number().int().positive().max(100000), requestId: uuid }).optional() }),
    department: z.strictObject({ ...department, reason }), departmentPatch: change(z.strictObject({ ...department, description: department.description.removeDefault(), icon: department.icon.removeDefault(), isActive: department.isActive.removeDefault() }).partial().shape),
    program: z.strictObject({ ...program, reason }), programPatch: change(z.strictObject({ ...program, campus: program.campus.removeDefault(), isActive: program.isActive.removeDefault() }).partial().shape),
    module: z.strictObject({ ...module, reason }), modulePatch: change(z.strictObject({ ...module, isActive: module.isActive.removeDefault() }).partial().shape),
    csv: z.strictObject({ csv: z.string().min(1).max(12000), dryRun: z.boolean().default(true), reason }),
    settings: change({ retentionDays: z.number().int().min(1).max(3650).optional(), lockdown: z.boolean().optional(), readOnly: z.boolean().optional(), bannerMessage: z.string().max(500).optional() }),
    announcement: z.strictObject({ ...announcement, reason, sendEmail: z.boolean().default(false), requestId: uuid.optional() }), announcementPatch: change(z.strictObject({ ...announcement, type: announcement.type.removeDefault(), isActive: announcement.isActive.removeDefault() }).partial().shape),
    verification: z.strictObject({ departmentId: uuid, evidence: z.string().trim().min(10).max(2000) }),
    verificationReview: z.strictObject({ status: z.enum(['approved', 'rejected']), reason }),
    queue: z.strictObject({ ...pagination, status: z.enum(['pending', 'approved', 'rejected']).optional() }),
    audit: z.strictObject({ ...pagination, actorUserId: uuid.optional(), targetId: uuid.optional(), targetType: z.string().max(40).optional(), action: z.string().max(80).optional() }),
    contact: z.strictObject({ senderName: z.string().trim().min(2).max(160), senderEmail: z.string().email().max(254), subject: z.string().trim().min(2).max(240), message: z.string().trim().min(10).max(4000) }),
    contactReview: z.strictObject({ status: z.enum(['new', 'in_progress', 'closed']), reason }),
};
