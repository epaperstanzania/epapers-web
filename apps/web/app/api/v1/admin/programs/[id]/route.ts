export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/structure';
import { catalogueStructureTag } from '@/lib/catalogue-cache';
export const OPTIONS=preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/programs/[id]',schemas.programPatch,async (data, _request, identity)=>{const id=z.string().uuid().parse(params.id);return service.saveProgram(identity!.user,data,id);},{"roles":["admin"],"requireReauth":false},false,{tag:catalogueStructureTag})(req);}
export async function DELETE(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/programs/[id]',schemas.reason,async (data, request, identity)=>{const id=z.string().uuid().parse(params.id);return service.deleteStructure(identity!.user,'programs',id,data.reason,{token:request.headers.get('x-epapers-reauth') || '',sessionId:identity!.session.id});},{"roles":["admin"],"requireReauth":true},false,{tag:catalogueStructureTag})(req);}
