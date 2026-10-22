import 'server-only';
import { z } from 'zod';
import { uuid } from '@epapers/server/modules/catalog/schemas';
import { env } from '@epapers/config/server-env';
export const uploadSchemas = {
    presign: z.strictObject({ filename: z.string().trim().min(1).max(240), contentType: z.literal('application/pdf'), sizeBytes: z.number().int().positive().max(env.MAX_UPLOAD_BYTES) }),
    duplicate: z.strictObject({ moduleId: uuid, category: z.enum(['TEST', 'UE', 'SUPP']), testNumber: z.coerce.number().int().min(1).max(2).optional(), academicYear: z.number().int().min(2000).max(2200), semester: z.number().int().min(1).max(2) }).superRefine((value, ctx) => {
        if ((value.category === 'TEST') !== (value.testNumber !== undefined)) ctx.addIssue({ code: 'custom', path: ['testNumber'], message: 'Choose Test 1 or Test 2 for test papers only' });
    }),
    create: z.strictObject({ moduleId: uuid, category: z.enum(['TEST', 'UE', 'SUPP']), testNumber: z.coerce.number().int().min(1).max(2).optional(), academicYear: z.number().int().min(2000).max(2200), semester: z.number().int().min(1).max(2), title: z.string().trim().min(2).max(240), examPeriod: z.string().trim().max(120).default(''), examUploadId: uuid, markingSchemeUploadId: uuid.optional() }).superRefine((value, ctx) => {
        if ((value.category === 'TEST') !== (value.testNumber !== undefined)) ctx.addIssue({ code: 'custom', path: ['testNumber'], message: 'Choose Test 1 or Test 2 for test papers only' });
    }),
    download: z.strictObject({ kind: z.enum(['exam', 'marking_scheme']).default('exam') }),
};
