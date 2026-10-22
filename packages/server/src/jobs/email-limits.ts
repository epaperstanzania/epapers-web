import { withTransactionRetry } from '@epapers/database';
/** Do not inflate the daily counter while a queue is waiting for tomorrow. */
export async function reserveDailyEmail(limit: number) {
    const rows = await withTransactionRetry(tx => tx.$queryRaw<Array<{ sent: bigint }>>`
        INSERT INTO email_daily_counters(day,sent) VALUES(current_date,1)
        ON CONFLICT(day) DO UPDATE SET sent=email_daily_counters.sent+1
        WHERE email_daily_counters.sent < ${limit} RETURNING sent`);
    return rows.length > 0;
}
