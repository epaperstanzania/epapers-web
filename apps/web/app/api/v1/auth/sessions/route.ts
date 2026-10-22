import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { sessions } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('auth/sessions', schemas.empty, async (d, req, identity) => sessions(identity!.user.id), true);
