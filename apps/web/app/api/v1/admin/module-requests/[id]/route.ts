export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';
import { catalogueStructureTag } from '@/lib/catalogue-cache';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('admin/module-requests/[id]', schemas.resolveModule, async (data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.resolveModule(identity!.user, id, data); }, true, false,{tag:catalogueStructureTag,when:data=>data.status==='approved'})(req);
}
