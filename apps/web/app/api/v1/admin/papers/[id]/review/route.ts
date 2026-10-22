export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
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
    return route('admin/papers/[id]/review', schemas.review, async (data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.review(identity!.user, id, data); }, true, false)(req);
}
