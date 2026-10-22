export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/papers/[id]/restore',schemas.reason,async (data, request, identity)=>{const id=z.string().uuid().parse(params.id);return service.restorePaper(identity!.user,id,data.reason,{token:request.headers.get('x-epapers-reauth') || '',sessionId:identity!.session.id});},{"roles":["admin"],"requireReauth":true},false)(req);}
