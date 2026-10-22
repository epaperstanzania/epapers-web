export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { exportSchema } from '@epapers/server/modules/accounts/service';

import * as service from '@epapers/server/modules/accounts/service';
export const OPTIONS=preflight;
export const GET=route('users/me/export',exportSchema,async (data, _request, identity)=>service.exportAccount(identity!.user,data),true,false);
