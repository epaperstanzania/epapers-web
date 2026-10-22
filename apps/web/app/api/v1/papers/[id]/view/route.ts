import { clientIp } from '@epapers/auth/policy';
export const runtime = 'nodejs';
import { route, preflight } from '@/lib/routes-helpers';
import { empty } from '@epapers/server/modules/catalog/schemas';
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
    return route('papers/[id]/view', empty, async (_data, request, _identity) => { const id = z.string().uuid().parse(params.id); return service.view(id, ipHash(clientIp(request.headers))); }, "optional", false)(req);
}
