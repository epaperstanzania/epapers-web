import { z } from 'zod';
import { catalogSchemas, empty, uuid } from '../src/modules/catalog/schemas';
import { uploadSchemas } from '../src/modules/uploads/schemas';
import { moderationSchemas } from '../src/modules/moderation/schemas';
const time = z.string().datetime(), nullableTime = time.nullable();
const department = z.strictObject({ id: uuid, code: z.string(), name: z.string(), description: z.string(), icon: z.string() });
const program = z.strictObject({ id: uuid, departmentId: uuid, code: z.string(), name: z.string(), level: z.enum(['ORDINARY_DIPLOMA', 'BACHELOR']), campus: z.enum(['MAIN', 'MWANZA', 'SONGWE']), awardTitle: z.string() });
const module = z.strictObject({ id: uuid, programId: uuid, code: z.string(), name: z.string(), semester: z.number().int(), levelYear: z.number().nullable(), credits: z.number().nullable() });
const page = (item: z.ZodType) => z.strictObject({ items: z.array(item), nextCursor: z.string().nullable() });
const paper = z.strictObject({ id: uuid, title: z.string(), category: z.enum(['TEST', 'UE', 'SUPP']), academicYear: z.number().int(), semester: z.number().int(), examPeriod: z.string(), module, program, department, uploader: z.strictObject({ username: z.string(), avatarId: z.string().nullable(), levelTitle: z.string(), isLecturerVerified: z.boolean() }).nullable(), pageCount: z.number().nullable(), hasMarkingScheme: z.boolean(), downloadAvailable: z.boolean(), viewsCount: z.number().int(), downloadsCount: z.number().int(), createdAt: time });
const statuses = z.enum(['pending', 'approved', 'rejected', 'spam']);
const receipt = z.strictObject({ id: uuid, status: z.string() });
const flags = z.strictObject({ id: uuid, paperId: uuid, reason: z.string(), details: z.string(), status: z.string(), resolutionNote: z.string().nullable(), createdAt: time });
const takedowns = z.strictObject({ id: uuid, paperId: uuid, requesterFullName: z.string(), requesterEmail: z.string(), affiliation: z.string(), reason: z.string(), evidence: z.string(), status: z.string(), reviewNote: z.string().nullable(), createdAt: time });
const moduleRequests = z.strictObject({ id: uuid, programId: uuid, moduleCode: z.string(), moduleName: z.string(), academicYear: z.number().int(), semester: z.number().int(), description: z.string(), status: z.string(), reviewNote: z.string().nullable(), createdAt: time });
export const responseSchemas = {
    department, program, module, paper, departmentPage: page(department), programPage: page(program), modulePage: page(module), paperPage: page(paper),
    programDetail: program.extend({ modules: page(module) }), moduleDetail: module.extend({ papers: page(paper) }),
    publicProfile: z.strictObject({ username: z.string(), bio: z.string(), avatarId: z.string().nullable(), levelTitle: z.string(), isLecturerVerified: z.boolean(), joinedAt: time }),
    uploadAuthorization: z.strictObject({ uploadId: uuid, uploadUrl: z.string().url(), expiresAt: time, headers: z.strictObject({ 'Content-Type': z.literal('application/pdf'), 'Content-Length': z.string(), 'If-None-Match': z.literal('*') }) }),
    uploadCompletion: z.strictObject({ uploadId: uuid, scanStatus: z.enum(['pending', 'clean', 'rejected']), completed: z.boolean() }),
    duplicateWarning: z.strictObject({ duplicateWarning: z.boolean() }),
    paperCreated: z.strictObject({ id: uuid, status: statuses, duplicateWarning: z.boolean(), levelTitle: z.string() }),
    downloadUrl: z.strictObject({ url: z.string().url(), expiresAt: time, filename: z.string() }),
    ownPaperPage: page(paper.extend({ status: statuses, rejectionReason: z.string().nullable(), duplicateWarning: z.boolean(), levelTitle: z.string() })),
    reviewResult: z.strictObject({ id: uuid, status: statuses, levelTitle: z.string() }), receipt,
    adminPaperPage: page(paper.extend({ status: statuses, rejectionReason: z.string().nullable(), duplicateWarning: z.boolean(), scanStatus: z.enum(['pending', 'clean', 'rejected']) })),
    adminPaper: paper.extend({ status: statuses, duplicateWarning: z.boolean(), rejectionReason: z.string().nullable(), uploads: z.strictObject({ exam: z.strictObject({ id: uuid, scanStatus: z.string() }), markingScheme: z.strictObject({ id: uuid, scanStatus: z.string() }).nullable() }), reviews: z.array(z.strictObject({ id: uuid, action: z.string(), reason: z.string(), createdAt: time })) }),
    leaderboardPage: page(z.strictObject({ rank: z.number().int(), username: z.string(), levelTitle: z.string(), xp: z.number().int(), approvedCount: z.number().int() })),
    achievementList: z.array(z.strictObject({ id: z.string(), title: z.string(), description: z.string(), category: z.string(), iconName: z.string(), maxProgress: z.number().int(), progress: z.number().int(), unlockedAt: nullableTime })),
    notificationPage: page(z.strictObject({ id: uuid, title: z.string(), type: z.string(), message: z.string(), link: z.string().nullable(), readAt: nullableTime, createdAt: time })),
    ledgerPage: page(z.strictObject({ id: uuid, userId: uuid, paperId: uuid.nullable(), amount: z.number().int().positive(), eventType: z.string(), reason: z.string(), title: z.string(), note: z.string(), status: z.string(), createdAt: time })),
    flagPage: page(flags), takedownPage: page(takedowns), moduleRequestPage: page(moduleRequests),
};
export function addPhasePaths(paths: Record<string, unknown>, definitions: Record<string, unknown>) {
    for (const [name, schema] of Object.entries(responseSchemas))
        definitions[name] = z.toJSONSchema(schema);
    const inputs: Record<string, z.ZodType> = { ...Object.fromEntries(Object.entries(catalogSchemas).map(([k, v]) => ['catalog_' + k, v])), ...Object.fromEntries(Object.entries(uploadSchemas).map(([k, v]) => ['upload_' + k, v])), ...Object.fromEntries(Object.entries(moderationSchemas).map(([k, v]) => ['moderation_' + k, v])), empty };
    for (const [name, schema] of Object.entries(inputs))
        definitions[name] = z.toJSONSchema(schema, { io: 'input' });
    const add = (path: string, method: string, input: keyof typeof inputs, output: keyof typeof responseSchemas | 'message', access: 'public' | 'authenticated' | 'optional' | 'admin' = 'public', cache = false) => {
        const schema = z.toJSONSchema(inputs[input], { io: 'input' }) as {
            properties?: Record<string, unknown>;
            required?: string[];
        };
        const parameters: Array<Record<string, unknown>> = [...path.matchAll(/\{(\w+)\}/g)].map(m => ({ name: m[1], in: 'path', required: true, schema: m[1] === 'codeOrId' ? { type: 'string', minLength: 2, maxLength: 40 } : m[1] === 'username' ? { type: 'string', pattern: '^[a-zA-Z0-9_]{3,30}$' } : { type: 'string', format: 'uuid' } }));
        if (method === 'get')
            for (const [name, property] of Object.entries(schema.properties || {}))
                parameters.push({ name, in: 'query', required: schema.required?.includes(name) || false, schema: property });
        else
            parameters.push({ name: 'X-EPapers-Client', in: 'header', required: true, schema: { type: 'string', const: 'web' } });
        const operation = { summary: path, description: (access === 'admin' ? 'Admin role required. ' : access === 'authenticated' ? 'Authentication required. ' : access === 'optional' ? 'Optional bearer authentication associates the request with the current account. ' : 'Public. ') + (cache ? 'Successful public metadata responses use public, max-age=60, s-maxage=300. ' : 'Responses use Cache-Control: no-store. '), security: access === 'optional' ? [{}, { bearerAuth: [] }] : ['admin', 'authenticated'].includes(access) ? [{ bearerAuth: [] }] : [], parameters, ...(method === 'get' ? {} : { requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + input } } } } }), responses: Object.fromEntries([['200', { description: 'Success', content: { 'application/json': { schema: { type: 'object', required: ['data'], additionalProperties: false, properties: { data: { $ref: '#/components/schemas/' + output } } } } } }], ...['401', '403', '404', '409', '422', '429', '500'].map(code => [code, { description: code === '409' ? 'Conflict or file not ready' : code === '422' ? 'Validation error' : 'Request failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/error' } } } }])]) };
        paths[path] = { ...(paths[path] as object || {}), [method]: operation };
    };
    for (const [path, input, output] of [['departments', 'catalog_departments', 'departmentPage'], ['programs', 'catalog_programs', 'programPage'], ['modules', 'catalog_modules', 'modulePage'], ['papers', 'catalog_papers', 'paperPage'], ['papers/recent', 'catalog_papers', 'paperPage'], ['papers/popular', 'catalog_papers', 'paperPage']] as const)
        add('/' + path, 'get', input, output, 'public', true);
    for (const [path, output] of [['departments/{id}', 'department'], ['programs/{id}', 'programDetail'], ['modules/{codeOrId}', 'moduleDetail'], ['papers/{id}', 'paper'], ['users/by-username/{username}', 'publicProfile']] as const)
        add('/' + path, 'get', 'empty', output, 'public', true);
    add('/uploads/presign', 'post', 'upload_presign', 'uploadAuthorization', 'authenticated');
    add('/uploads/{id}/complete', 'post', 'empty', 'uploadCompletion', 'authenticated');
    add('/papers', 'post', 'upload_create', 'paperCreated', 'authenticated');
    add('/papers/duplicate-check', 'post', 'upload_duplicate', 'duplicateWarning', 'authenticated');
    add('/papers/{id}/download-url', 'post', 'upload_download', 'downloadUrl', 'optional');
    add('/papers/{id}/view', 'post', 'empty', 'message', 'optional');
    add('/users/me/papers', 'get', 'catalog_departments', 'ownPaperPage', 'authenticated');
    add('/admin/papers', 'get', 'moderation_adminPapers', 'adminPaperPage', 'admin');
    add('/admin/papers/{id}', 'get', 'empty', 'adminPaper', 'admin');
    add('/admin/papers/{id}/review', 'patch', 'moderation_review', 'reviewResult', 'admin');
    add('/admin/papers/{id}/download-url', 'post', 'upload_download', 'downloadUrl', 'admin');
    add('/leaderboard', 'get', 'moderation_leaderboard', 'leaderboardPage', 'authenticated');
    add('/users/me/achievements', 'get', 'empty', 'achievementList', 'authenticated');
    add('/notifications', 'get', 'catalog_departments', 'notificationPage', 'authenticated');
    add('/notifications/{id}', 'patch', 'moderation_readNotification', 'message', 'authenticated');
    add('/notifications/read-all', 'post', 'empty', 'message', 'authenticated');
    add('/admin/users/{id}/xp-ledger', 'get', 'catalog_departments', 'ledgerPage', 'admin');
    for (const [path, input, resolve, output] of [['flags', 'moderation_flags', 'moderation_resolveFlag', 'flagPage'], ['takedowns', 'moderation_takedowns', 'moderation_resolveTakedown', 'takedownPage'], ['module-requests', 'moderation_moduleRequests', 'moderation_resolveModule', 'moduleRequestPage']] as const) {
        add('/' + path, 'post', input, 'receipt', path === 'module-requests' ? 'optional' : 'authenticated');
        add('/admin/' + path, 'get', 'moderation_queue', output, 'admin');
        add('/admin/' + path + '/{id}', 'patch', resolve, 'receipt', 'admin');
    }
}
