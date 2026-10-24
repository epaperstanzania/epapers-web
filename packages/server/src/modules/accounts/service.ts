import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { page, cursorId } from '@epapers/server/modules/catalog/service';
import { pagination } from '@epapers/server/modules/catalog/schemas';
import { User } from '@epapers/database/client';
import { db, withTransactionRetry } from '@epapers/database';
import { authorize } from '@epapers/server/modules/auth/service';
import { privateUser } from '@epapers/server/modules/auth/dto';
import { fail } from '@epapers/config/errors';
import { verifyPassword } from '@epapers/auth/crypto';
import { removeProfileImage } from '@epapers/server/modules/auth/avatar';
export const exportSchema = z.strictObject({ limit: pagination.limit, paperCursor: pagination.cursor, notificationCursor: pagination.cursor });
export const deleteAccountSchema = z.strictObject({password:z.string().min(1).max(128)});
export async function exportAccount(user: User, q: z.infer<typeof exportSchema> = { limit: 25 }) {
    authorize(user, {});
    const u = await db.user.findUnique({ where: { id: user.id } });
    if (!u)
        fail(401, 'UNAUTHORIZED', 'Authentication required');
    authorize(u, {});
    const args = (cursor?: string) => { const id = cursorId(cursor); return { take: q.limit + 1, orderBy: { id: 'asc' as const }, ...(id ? { cursor: { id }, skip: 1 } : {}) }; };
    const [papers, notifications] = await Promise.all([db.paper.findMany({ where: { uploadedByUserId: u.id }, ...args(q.paperCursor) }), db.notification.findMany({ where: { userId: u.id }, ...args(q.notificationCursor) })]);
    return { profile: privateUser(u), papers: page(papers, q.limit, p => ({ id: p.id, title: p.title, status: p.status.toLowerCase(), moduleId: p.moduleId, createdAt: p.createdAt.toISOString() })), notifications: page(notifications, q.limit, n => ({ id: n.id, title: n.title, message: n.message, readAt: n.readAt?.toISOString() || null })) };
}
export async function deleteAccount(user: User, password: string) { authorize(user, {}); if (user.role === 'ADMIN')
    fail(409, 'ADMIN_ACCOUNT', 'Transfer administrative access before account deletion'); if (!await verifyPassword(user.passwordHash, password))
    fail(401, 'INVALID_CREDENTIALS', 'Invalid credentials'); const previousAvatar = await withTransactionRetry(async (tx) => { await tx.$queryRaw `SELECT id FROM users WHERE id=${user.id}::UUID FOR UPDATE`; const current = await tx.user.findUnique({ where: { id: user.id } }); if (!current)
    fail(401, 'UNAUTHORIZED', 'Authentication required'); authorize(current, {}); if (current.role === 'ADMIN' || current.passwordHash !== user.passwordHash)
    fail(409, 'ACCOUNT_CHANGED', 'Account changed; sign in again'); const tombstone = 'deleted_' + randomUUID().replaceAll('-', '').slice(0, 20); await tx.user.update({ where: { id: user.id }, data: { deletedAt: new Date(), status: 'BANNED', fullName: 'Deleted account', email: tombstone + '@deleted.invalid', emailNormalized: tombstone + '@deleted.invalid', username: tombstone, usernameNormalized: tombstone, bio: '', avatarId: null, passwordHash: 'disabled-deleted-account', totpSecret: null, homeDepartmentId: null, lecturerVerifiedAt: null } }); await tx.userSession.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } }); await tx.adminAuthChallenge.deleteMany({ where: { userId: user.id } }); await tx.authChallenge.deleteMany({ where: { userId: user.id } }); await tx.notification.deleteMany({ where: { userId: user.id } }); await tx.lecturerVerification.updateMany({ where: { userId: user.id }, data: { evidence: '[anonymized]', reviewNote: null } }); await tx.contactMessage.updateMany({ where: { senderUserId: user.id }, data: { senderName: 'Deleted account', senderEmail: tombstone + '@deleted.invalid', message: '[anonymized]' } }); await tx.takedownRequest.updateMany({ where: { requesterUserId: user.id }, data: { requesterFullName: 'Deleted account', requesterEmail: tombstone + '@deleted.invalid', affiliation: '', evidence: '[anonymized]' } }); await tx.usernameRegistry.updateMany({ where: { userId: user.id, isCurrent: true }, data: { isCurrent: false, retiredAt: new Date() } }); await tx.auditLog.create({ data: { actorUserId: user.id, action: 'ACCOUNT_DELETED', targetType: 'user', targetId: user.id, reason: 'Account owner request' } }); return current.avatarId; }); await removeProfileImage(user.id, previousAvatar); return { message: 'Account deleted' }; }
