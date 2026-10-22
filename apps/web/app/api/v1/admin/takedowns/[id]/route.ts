export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function PATCH(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('admin/takedowns/[id]', schemas.resolveTakedown, async (data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.resolveTakedown(identity!.user, id, data); }, true, false)(req);
}
