import { startPortalSession } from '@epapers/auth/portal-session';
export const runtime = 'nodejs';
export const GET = (request: Request) => startPortalSession(request, 'lecturer');
