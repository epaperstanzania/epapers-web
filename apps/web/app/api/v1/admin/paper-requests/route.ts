export const runtime = 'nodejs';
import { route } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';

export const GET = route('admin/paper-requests', schemas.queue, async (data, _request, identity) => service.paperRequestQueue(identity!.user, data), true, false);
