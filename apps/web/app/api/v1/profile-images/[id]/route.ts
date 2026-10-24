import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { route } from '@/lib/routes-helpers';
import { readProfileImage } from '@epapers/server/modules/auth/avatar';
export const runtime = 'nodejs';
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return route('profile-images/[id]', z.strictObject({}), async () => {
    const image = await readProfileImage(id);
    return new NextResponse(new Uint8Array(image.bytes), { headers: { 'Content-Type': image.type, 'X-Content-Type-Options': 'nosniff' } });
  }, false, true)(request);
}
