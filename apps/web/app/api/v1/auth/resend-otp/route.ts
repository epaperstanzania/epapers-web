import { route, preflight } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { resend } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/resend-otp', schemas.resend, async (d) => resend(d.email, 'otp'), false);
