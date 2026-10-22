import { route, preflight, sessionResponse } from '@epapers/server/modules/auth/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { refresh } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/refresh', schemas.empty, async (d, req) => sessionResponse(await refresh(req.cookies.get('epapers_refresh')?.value || '')), false);
