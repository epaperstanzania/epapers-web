export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import * as service from '@epapers/server/modules/gamification/service';
import { empty } from '@epapers/server/modules/catalog/schemas';
export const OPTIONS = preflight;
export const GET = route('users/me/achievements', empty, async (_data, _request, identity) => service.achievements(identity!.user), true, false);
