export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { empty } from '@epapers/server/modules/catalog/schemas';
import * as service from '@epapers/server/modules/catalog/service';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function GET(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('programs/[id]', empty, async (_data, _request, _identity) => { const id = z.string().uuid().parse(params.id); return service.program(id); }, false, true)(req);
}
