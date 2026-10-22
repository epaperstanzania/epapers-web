import 'server-only';
import { db } from '@epapers/database';
import { fail } from '@epapers/config/errors';
/** Read-only leaves authentication, security recovery and administrative recovery available. */
export async function enforceWritePolicy(name: string, method: string) { if (method === 'GET' || name.startsWith('auth/') || name === 'login' || name.startsWith('admin/'))
    return; const setting = await db.appSetting.findUnique({ where: { key: 'readOnly' } }); if (setting?.value === true)
    fail(403, 'READ_ONLY', 'The service is temporarily read-only'); }
