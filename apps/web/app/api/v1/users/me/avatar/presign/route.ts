import { z } from 'zod';
import { route, preflight } from '@/lib/routes-helpers';
import { presignProfileImage, MAX_PROFILE_IMAGE_BYTES } from '@epapers/server/modules/auth/avatar';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
const input = z.strictObject({ contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']), sizeBytes: z.number().int().positive().max(MAX_PROFILE_IMAGE_BYTES) });
export const POST = route('users/me/avatar/presign', input, async (data, _request, identity) => presignProfileImage(identity!.user.id, data.contentType, data.sizeBytes), true);
