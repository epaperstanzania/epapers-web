import { finishPortalSession } from '@epapers/auth/portal-session';
export const runtime = 'nodejs';
export const GET = (request: Request) => finishPortalSession(request, 'lecturer');
