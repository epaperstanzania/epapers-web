import { route, preflight } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { reauthenticate } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/reauth', schemas.reauth, async (d, _req, identity) => reauthenticate(identity!.user.id, identity!.session.id, d.password), { roles: ['admin'] });
