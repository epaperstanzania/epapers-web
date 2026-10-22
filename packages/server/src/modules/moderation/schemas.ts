import 'server-only';
import { z } from 'zod';
import { uuid, pagination } from '@epapers/server/modules/catalog/schemas';
export const moderationSchemas = {
    review: z.strictObject({ action: z.enum(['approved', 'rejected', 'marked_spam', 'edited']), reason: z.string().trim().max(2000).default(''), title: z.string().trim().min(2).max(240).optional(), moduleId: uuid.optional() }).superRefine((v, ctx) => { if (['rejected', 'marked_spam'].includes(v.action) && !v.reason)
        ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Reason is required' }); if (v.action === 'edited' && !v.title && !v.moduleId)
        ctx.addIssue({ code: 'custom', message: 'Choose metadata to correct' }); }),
    adminPapers: z.strictObject({ ...pagination, status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']).optional(), departmentId: uuid.optional(), programId: uuid.optional(), moduleId: uuid.optional() }),
    flags: z.strictObject({ paperId: uuid, reason: z.enum(['blurry_scan', 'wrong_module', 'copyright', 'duplicate', 'offensive', 'incomplete']), details: z.string().trim().max(2000).default('') }),
    takedowns: z.strictObject({ paperId: uuid, requesterFullName: z.string().trim().min(2).max(160), requesterEmail: z.string().email().max(254), affiliation: z.string().trim().max(240), reason: z.string().trim().min(10).max(4000), evidence: z.string().trim().max(4000).default('') }),
    moduleRequests: z.strictObject({ departmentId: uuid, programId: uuid, moduleCode: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/), moduleName: z.string().trim().min(2).max(240), academicYear: z.number().int().min(2000).max(2200), semester: z.number().int().min(1).max(2), description: z.string().trim().max(2000) }),
    queue: z.strictObject({ ...pagination, status: z.string().max(30).optional(), programId: uuid.optional(), departmentId: uuid.optional() }),
    resolveFlag: z.strictObject({ status: z.enum(['resolved', 'dismissed']), note: z.string().trim().min(1).max(2000) }),
    resolveTakedown: z.strictObject({ status: z.enum(['approved_removed', 'rejected']), note: z.string().trim().min(1).max(2000) }),
    resolveModule: z.strictObject({ status: z.enum(['approved', 'rejected']), note: z.string().trim().min(1).max(2000) }),
    leaderboard: z.strictObject({ ...pagination, period: z.enum(['week', 'month', 'all']).default('all') }),
    readNotification: z.strictObject({ read: z.literal(true) }),
};
