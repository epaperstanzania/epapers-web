export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';
export const OPTIONS = preflight;
export const GET = route('admin/takedowns', schemas.queue, async (data, _request, identity) => service.queue(identity!.user, 'takedowns', data), true, false);
