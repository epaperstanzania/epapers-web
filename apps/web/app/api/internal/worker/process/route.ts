import { timingSafeEqual } from 'node:crypto';
import { processBatch } from '@epapers/server/jobs/index';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isAuthorized(header: string | null, expected: string): boolean {
  if (!header?.startsWith('Bearer ')) {
    return false;
  }

  const supplied = Buffer.from(header.slice('Bearer '.length));
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export async function POST(request: Request): Promise<Response> {
  const token = process.env.EPAPERS_WORKER_TOKEN;
  if (!token) {
    return Response.json({ error: 'Worker endpoint is not configured' }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get('authorization'), token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await processBatch({ maxJobs: 20, maxRuntimeMs: 45_000 });
    return Response.json({ processed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Scheduled worker batch failed', error);
    return Response.json({ error: 'Worker batch failed' }, { status: 500 });
  }
}