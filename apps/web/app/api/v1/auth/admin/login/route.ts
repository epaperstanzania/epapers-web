import { route, preflight, sessionResponse } from '@epapers/server/modules/auth/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { login } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/admin/login', schemas.adminLogin, async (d) => {
    const result = await login(d.usernameOrEmail, d.password, true);
    return 'verificationRequired' in result ? result : sessionResponse(result);
}, false);
