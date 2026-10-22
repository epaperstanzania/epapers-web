export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/contact';
export const OPTIONS=preflight;
export const POST=route('contact-messages',schemas.contact,async (data, _request, identity)=>service.contact(data,identity!.user),true,false);
