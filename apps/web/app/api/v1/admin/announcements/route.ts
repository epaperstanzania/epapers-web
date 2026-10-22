export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
export const GET=route('admin/announcements',catalogSchemas.departments,async (data, _request, identity)=>service.announcements(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
export const POST=route('admin/announcements',schemas.announcement,async (data, _request, identity)=>service.saveAnnouncement(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
