export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/users',schemas.list,async (data, _request, identity)=>service.users(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
