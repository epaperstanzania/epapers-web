export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';

import { deleteAccountSchema } from '@epapers/server/modules/accounts/service';
import * as service from '@epapers/server/modules/accounts/service';
export const OPTIONS=preflight;
export const DELETE=route('users/me/account',deleteAccountSchema,async (data, _request, identity)=>service.deleteAccount(identity!.user,data.password),true,false);
