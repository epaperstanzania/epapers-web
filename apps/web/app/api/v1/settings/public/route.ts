export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';

import { empty } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('settings/public',empty,async (_data, _request, _identity)=>service.publicSettings(),false,true);
