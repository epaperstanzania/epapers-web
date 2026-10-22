import 'server-only';
import { withTransactionRetry } from '@epapers/database';
import { fail } from '@epapers/config/errors';
export async function rateLimit(key: string, limit: number, seconds: number) {
    const rows = await withTransactionRetry(tx => tx.$queryRaw<Array<{
        hits: number;
    }>> `
 INSERT INTO rate_limit_counters(key,hits,expires_at) VALUES (${key},1,now()+${seconds} * INTERVAL '1 second')
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limit_counters.expires_at <= now() THEN 1 ELSE rate_limit_counters.hits+1 END,
 expires_at=CASE WHEN rate_limit_counters.expires_at <= now() THEN excluded.expires_at ELSE rate_limit_counters.expires_at END RETURNING hits`);
    if (rows[0].hits > limit)
        fail(429, 'RATE_LIMITED', 'Too many requests; try again later');
}
