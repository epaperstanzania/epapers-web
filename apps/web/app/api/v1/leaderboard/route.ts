export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/gamification/service';
export const OPTIONS = preflight;
export const GET = route('leaderboard', schemas.leaderboard, async (data, _request, identity) => service.leaderboard(identity!.user, data), true, false);
