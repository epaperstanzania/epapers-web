import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { verifyAdminReauthentication } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/reauth/verify', schemas.adminVerify, async (d, _req, identity) => verifyAdminReauthentication(identity!.user.id, identity!.session.id, d.challengeToken, d.code), { roles: ['admin'] });
