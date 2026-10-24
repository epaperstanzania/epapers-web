import { z } from 'zod';
import { route, preflight } from '@/lib/routes-helpers';
import { completeProfileImage } from '@epapers/server/modules/auth/avatar';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('users/me/avatar/complete', z.strictObject({ token: z.string().max(256) }), async (data, _request, identity) => completeProfileImage(identity!.user.id, data.token), true);
