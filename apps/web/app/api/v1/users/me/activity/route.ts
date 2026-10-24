import { z } from 'zod';
import { route, preflight } from '@/lib/routes-helpers';
import { recordPageView } from '@epapers/server/modules/auth/activity';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('users/me/activity', z.strictObject({ path: z.string().max(160) }), async (data, _request, identity) => recordPageView(identity!.user.id, identity!.user.role, data.path), true);
