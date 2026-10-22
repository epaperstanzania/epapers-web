export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { catalogSchemas as schemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/catalog/service';
export const OPTIONS = preflight;
export const GET = route('papers/recent', schemas.papers, async (data, _request, _identity) => service.papers({ ...data, sortBy: 'recent' }), false, true);
