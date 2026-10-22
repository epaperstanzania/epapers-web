export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import * as service from '@epapers/server/modules/moderation/service';
import { uploadSchemas } from '@epapers/server/modules/uploads/schemas';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function POST(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('admin/papers/[id]/download-url', uploadSchemas.download, async (data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.reviewFile(identity!.user, id, data.kind); }, true, false)(req);
}
