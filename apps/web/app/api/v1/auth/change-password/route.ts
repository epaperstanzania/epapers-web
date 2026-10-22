import { route, preflight, clearSession } from '@epapers/server/modules/auth/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { changePassword } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/change-password', schemas.changePassword, async (data, _req, identity) => {
    const result = await changePassword(identity!.user.id, identity!.session.id, data.currentPassword, data.password);
    return clearSession(result.message);
}, true);
