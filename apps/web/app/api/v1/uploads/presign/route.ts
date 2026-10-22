export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { uploadSchemas as schemas } from '@epapers/server/modules/uploads/schemas';
import * as service from '@epapers/server/modules/uploads/service';
export const OPTIONS = preflight;
export const POST = route('uploads/presign', schemas.presign, async (data, _request, identity) => service.presign(identity!.user, data), true, false);
