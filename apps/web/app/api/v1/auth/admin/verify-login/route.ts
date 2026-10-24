import { route, preflight, sessionResponse } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { verifyAdminLogin } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/admin/verify-login', schemas.adminVerify, async d => sessionResponse(await verifyAdminLogin(d.challengeToken, d.code, d.rememberDevice)));
