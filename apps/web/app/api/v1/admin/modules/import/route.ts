export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/structure';
export const OPTIONS=preflight;
export const POST=route('admin/modules/import',schemas.csv,async (data, _request, identity)=>service.importModules(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
