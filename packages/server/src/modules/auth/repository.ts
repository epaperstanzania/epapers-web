import 'server-only';
import type { TransactionClient } from '@epapers/database';
export interface Challenge {
    id: string;
    user_id: string;
    token_hash: string;
    attempts: bigint;
    expires_at: Date;
    consumed_at: Date | null;
    created_at: Date;
}
export async function challenge(tx: TransactionClient, userId: string, kind: string) {
    const rows = await tx.$queryRaw<Challenge[]> `SELECT * FROM auth_challenges WHERE user_id=${userId}::UUID AND kind=${kind} ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;
    return rows[0];
}
export function audit(tx: TransactionClient, userId: string, action: string) { return tx.$executeRaw `INSERT INTO audit_logs(actor_user_id,action,target_type,target_id) VALUES (${userId}::UUID,${action},'user',${userId}::UUID)`; }
