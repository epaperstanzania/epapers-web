export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const POST=route('lecturer/verifications',schemas.verification,async (data, _request, identity)=>service.submitVerification(identity!.user,data),true,false);
