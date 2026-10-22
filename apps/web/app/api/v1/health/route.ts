import { db } from '@epapers/database';
import { logger } from '@epapers/server/lib/logger';
import { errorResponse, json, securityHeaders } from '@epapers/server/lib/http';
export const runtime = 'nodejs';
export async function GET() {
    try {
        await db.$queryRaw `SELECT 1`;
        return json({ data: { status: 'ok', database: 'ok', timestamp: new Date().toISOString() } }, 200, securityHeaders());
    }
    catch (error) {
        logger.error({ err: error }, 'Health check database probe failed');
        return errorResponse('SERVICE_UNAVAILABLE', 'Service is temporarily unavailable', 503);
    }
}
