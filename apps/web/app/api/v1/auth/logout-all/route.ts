import { route, preflight, clearSession } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { logoutAll } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/logout-all', schemas.empty, async (_d, _req, identity) => { await logoutAll(identity!.user.id); return clearSession(); }, true);
