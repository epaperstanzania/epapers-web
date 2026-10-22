import { db } from '@epapers/database';
import { logger } from '@epapers/server/lib/logger';
export async function verifyXpLedger() { const mismatches = await db.$queryRaw<Array<{
    id: string;
}>> `SELECT u.id FROM users u LEFT JOIN xp_ledger l ON l.user_id=u.id AND l.status='applied' WHERE u.deleted_at IS NULL GROUP BY u.id,u.xp,u.all_time_xp HAVING COALESCE(SUM(l.amount),0)!=u.xp OR COALESCE(SUM(l.amount),0)!=u.all_time_xp LIMIT 100`; for (const row of mismatches)
    logger.error({ userId: row.id }, 'XP ledger verification mismatch'); }
