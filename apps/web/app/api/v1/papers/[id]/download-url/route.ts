export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { uploadSchemas as schemas } from '@epapers/server/modules/uploads/schemas';
import * as service from '@epapers/server/modules/uploads/service';
import { ipHash } from '@epapers/auth/crypto';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function POST(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('papers/[id]/download-url', schemas.download, async (data, request, _identity) => { const id = z.string().uuid().parse(params.id); return service.download(id, data.kind, ipHash(request.headers.get('cf-connecting-ip') || 'local')); }, "optional", false)(req);
}
