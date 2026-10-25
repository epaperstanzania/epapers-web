import { route, preflight } from '@/lib/routes-helpers';
import { adminSchemas } from '@epapers/server/modules/admin/schemas';
import { myAuditLogs } from '@epapers/server/modules/admin/service';

export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('users/me/audit-logs', adminSchemas.audit, async (data, _request, identity) =>
    myAuditLogs(identity!.user, data), true);
