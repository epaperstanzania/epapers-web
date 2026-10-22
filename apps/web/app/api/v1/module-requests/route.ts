export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';
export const OPTIONS = preflight;
export const POST = route('module-requests', schemas.moduleRequests, async (data, _request, identity) => service.moduleRequest(data, identity?.user), "optional", false);
