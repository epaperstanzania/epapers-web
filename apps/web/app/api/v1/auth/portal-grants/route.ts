import { route, preflight } from '@/lib/routes-helpers';
import { schemas } from '@epapers/server/modules/auth/schemas';
import { createPortalGrant } from '@epapers/server/modules/auth/service';
export const runtime = 'nodejs';
export const OPTIONS = preflight;
export const POST = route('auth/portal-grants', schemas.portalGrant, async (data, _request, identity) =>
  createPortalGrant(identity!.user.id, identity!.session.id, data), true);
