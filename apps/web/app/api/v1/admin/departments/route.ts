export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/structure';
export const OPTIONS=preflight;
export const GET=route('admin/departments',catalogSchemas.departments,async (data, _request, identity)=>service.structureList(identity!.user,'departments',data),{"roles":["admin"],"requireReauth":false},false);
export const POST=route('admin/departments',schemas.department,async (data, _request, identity)=>service.saveDepartment(identity!.user,data),{"roles":["admin"],"requireReauth":false},false);
