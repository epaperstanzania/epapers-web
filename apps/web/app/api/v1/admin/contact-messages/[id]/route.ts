export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { adminSchemas as schemas } from '@epapers/server/modules/admin/schemas';

import * as service from '@epapers/server/modules/admin/contact';
export const OPTIONS=preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){const params=await context.params;return route('admin/contact-messages/[id]',schemas.contactReview,async (data, _request, identity)=>{const id=z.string().uuid().parse(params.id);return service.resolveContact(identity!.user,id,data);},{"roles":["admin"],"requireReauth":false},false)(req);}
