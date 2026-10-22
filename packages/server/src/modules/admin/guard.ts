import 'server-only';
import { TransactionClient } from '@epapers/database';
import { User, Prisma } from '@epapers/database/client';
import { authorize } from '@epapers/server/modules/auth/service';
import { verifyReauthentication } from '@epapers/auth/jwt';
import { fail } from '@epapers/config/errors';
export interface AdminProof {
    token: string;
    sessionId: string;
}
export async function adminGuard(tx: TransactionClient, user: User, proof?: AdminProof) {
    const current = await tx.user.findFirst({ where: { id: user.id, deletedAt: null } });
    if (!current)
        fail(401, 'UNAUTHORIZED', 'Authentication required');
    authorize(current, { roles: ['admin'] });
    if (proof) {
        let claims;
        try {
            claims = await verifyReauthentication(proof.token);
        }
        catch {
            fail(401, 'REAUTH_REQUIRED', 'Reauthentication required');
        }
        if (claims.sub !== user.id || claims.sid !== proof.sessionId)
            fail(401, 'REAUTH_REQUIRED', 'Reauthentication required');
        if (!await tx.userSession.findFirst({ where: { id: proof.sessionId, userId: user.id, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } } }))
            fail(401, 'UNAUTHORIZED', 'Authentication required');
    }
}
export function requireProof(proof?: AdminProof): AdminProof { if (!proof)
    fail(401, 'REAUTH_REQUIRED', 'Reauthentication required'); return proof; }
export async function audit(tx: TransactionClient, userId: string, action: string, targetType: string, targetId: string | null, reason: string) { await tx.auditLog.create({ data: { actorUserId: userId, action, targetType, targetId, reason } }); }
// The restore path deliberately uses the raw client to include deleted papers.
export async function rawAdminGuard(tx: Prisma.TransactionClient, user: User, proof: AdminProof) {
    const current = await tx.user.findFirst({ where: { id: user.id, deletedAt: null } });
    if (!current)
        fail(401, 'UNAUTHORIZED', 'Authentication required');
    authorize(current, { roles: ['admin'] });
    let claims;
    try {
        claims = await verifyReauthentication(proof.token);
    }
    catch {
        fail(401, 'REAUTH_REQUIRED', 'Reauthentication required');
    }
    if (claims.sub !== user.id || claims.sid !== proof.sessionId)
        fail(401, 'REAUTH_REQUIRED', 'Reauthentication required');
    if (!await tx.userSession.findFirst({ where: { id: proof.sessionId, userId: user.id, revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } } }))
        fail(401, 'UNAUTHORIZED', 'Authentication required');
}
