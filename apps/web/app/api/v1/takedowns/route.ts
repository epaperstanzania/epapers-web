export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';
export const OPTIONS = preflight;
export const POST = route('takedowns', schemas.takedowns, async (data, _request, identity) => service.takedown(data, identity!.user), true, false);
