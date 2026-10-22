export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';
import { empty } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function GET(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/users/[id]',empty,async (_data, _request, identity)=>{const id=z.string().uuid().parse(params.id);return service.user(identity!.user,id);},{"roles":["admin"],"requireReauth":false},false)(req);}
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/users/[id]',schemas.user,async (data, request, identity)=>{const id=z.string().uuid().parse(params.id);return service.manageUser(identity!.user,id,data,{token:request.headers.get('x-epapers-reauth') || '',sessionId:identity!.session.id});},{"roles":["admin"],"requireReauth":true},false)(req);}
