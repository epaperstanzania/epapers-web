export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import * as service from '@epapers/server/modules/gamification/service';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
export const OPTIONS = preflight;
export const GET = route('notifications', catalogSchemas.departments, async (data, _request, identity) => service.notifications(identity!.user, data), true, false);
