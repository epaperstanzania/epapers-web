import { route, preflight, sessionResponse } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { exchangePortalGrant } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/portal-exchange', schemas.portalExchange, async (data, request) =>
  sessionResponse(await exchangePortalGrant(data, request.headers.get('origin'))));
