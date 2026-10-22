import { route, preflight, clearSession } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { logout } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/logout', schemas.empty, async (d, req) => (await logout(req.cookies.get('epapers_refresh')?.value || ''), clearSession()), false);
