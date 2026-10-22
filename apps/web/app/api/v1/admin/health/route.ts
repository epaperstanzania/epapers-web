import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { empty } from '@epapers/server/modules/catalog/schemas';
import { systemHealth } from '@epapers/server/modules/admin/health';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('admin/health', empty, async (_data, _request, identity) => systemHealth(identity!.user), { roles: ['admin'] });
