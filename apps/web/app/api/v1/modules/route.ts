export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { catalogSchemas as schemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/catalog/service';
export const OPTIONS = preflight;
export const GET = route('modules', schemas.modules, async (data, _request, _identity) => service.modules(data), false, true);
