export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';

import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('announcements/active',catalogSchemas.departments,async (data, _request, _identity)=>service.activeAnnouncements(data),false,true);
