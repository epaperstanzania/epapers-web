export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { route, preflight } from '@epapers/server/modules/auth/routes-helpers';
import { empty } from '@epapers/server/modules/catalog/schemas';
import { publicProfile } from '@epapers/server/modules/catalog/service';
export const OPTIONS = preflight;
export async function GET(req: NextRequest, context: {
    params: Promise<{
        username: string;
    }>;
}) { const params = await context.params; return route('users/by-username/[username]', empty, async () => publicProfile(z.string().regex(/^[a-zA-Z0-9_]{3,30}$/).parse(params.username)), false, true)(req); }
