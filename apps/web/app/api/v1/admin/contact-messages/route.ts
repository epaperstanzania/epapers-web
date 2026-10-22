export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';

import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/contact';
export const OPTIONS=preflight;
export const GET=route('admin/contact-messages',catalogSchemas.departments,async (data, _request, identity)=>service.contacts(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
