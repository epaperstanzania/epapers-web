export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/service';
export const OPTIONS=preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/lecturer-verifications/[id]',schemas.verificationReview,async (data, request, identity)=>{const id=z.string().uuid().parse(params.id);return service.reviewVerification(identity!.user,id,data,{token:request.headers.get('x-epapers-reauth') || '',sessionId:identity!.session.id});},{"roles":["admin"],"requireReauth":true},false)(req);}
