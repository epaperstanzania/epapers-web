import { route, preflight } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { verifyOtp } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/verify-otp', schemas.verifyOtp, async (d) => verifyOtp(d.email, d.code), false);
