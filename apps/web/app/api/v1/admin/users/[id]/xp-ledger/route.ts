export const runtime = 'nodejs';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import * as service from '@epapers/server/modules/gamification/service';
import { catalogSchemas } from '@epapers/server/modules/catalog/schemas';
export const OPTIONS = preflight;
import { NextRequest } from 'next/server';
import { z } from 'zod';
export async function GET(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await context.params;
    return route('admin/users/[id]/xp-ledger', catalogSchemas.departments, async (data, _request, identity) => { const id = z.string().uuid().parse(params.id); return service.ledger(identity!.user, id, data); }, true, false)(req);
}
