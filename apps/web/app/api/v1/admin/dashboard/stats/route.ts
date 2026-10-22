export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';

import { empty } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/dashboard/stats',empty,async (_data, _request, identity)=>service.stats(identity!.user),{"roles":["admin"],"requireReauth":false},false);
