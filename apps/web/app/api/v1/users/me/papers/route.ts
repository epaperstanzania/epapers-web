export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/uploads/service';
export const OPTIONS = preflight;
export const GET = route('users/me/papers', catalogSchemas.departments, async (data, _request, identity) => service.myPapers(identity!.user, data), true, false);
