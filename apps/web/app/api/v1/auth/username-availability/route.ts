import { route, preflight } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { availability } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('auth/username-availability', schemas.availability, async (d) => availability(d.username), false);
