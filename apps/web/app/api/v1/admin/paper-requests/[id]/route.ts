export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { route, preflight } from '@/lib/routes-helpers';
import { moderationSchemas as schemas } from '@epapers/server/modules/moderation/schemas';
import * as service from '@epapers/server/modules/moderation/service';

export const OPTIONS = preflight;
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return route('admin/paper-requests/[id]', schemas.resolvePaperRequest, (data, _request, identity) => service.resolvePaperRequest(identity!.user, z.string().uuid().parse(id), data), true, false)(request);
}
