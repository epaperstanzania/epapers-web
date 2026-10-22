import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { privateUser } from '@epapers/server/modules/auth/dto';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const GET = route('auth/me', schemas.empty, async (d, req, identity) => privateUser(identity!.user), true);
