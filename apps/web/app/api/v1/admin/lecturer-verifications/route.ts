export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/lecturer-verifications',schemas.queue,async (data, _request, identity)=>service.verifications(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
