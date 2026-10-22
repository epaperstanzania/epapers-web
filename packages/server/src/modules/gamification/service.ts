import 'server-only';
import { User, Paper } from '@epapers/database/client';
import { db, TransactionClient, withTransactionRetry } from '@epapers/database';
import { authorize } from '@epapers/server/modules/auth/service';
import { levelTitleForXp } from '@epapers/server/lib/levels';
import { cursorId, page } from '@epapers/server/modules/catalog/service';
import { fail } from '@epapers/config/errors';
import { z } from 'zod';
import { moderationSchemas } from '@epapers/server/modules/moderation/schemas';
export async function grantApproval(tx: TransactionClient, p: Paper) {
    await tx.$queryRaw `SELECT id FROM users WHERE id=${p.uploadedByUserId}::UUID FOR UPDATE`;
    const rewards = [{ amount: 50, eventType: 'APPROVED_PAPER' }, ...(p.markingSchemeFileId ? [{ amount: 30, eventType: 'MARKING_SCHEME' }] : [])];
    let total = 0;
    for (const reward of rewards) {
        const rewardKey = p.id + ':' + reward.eventType;
        if (!await tx.xpLedger.findUnique({ where: { rewardKey } })) {
            await tx.xpLedger.create({ data: { userId: p.uploadedByUserId, paperId: p.id, amount: BigInt(reward.amount), eventType: reward.eventType, rewardKey, title: p.title, reason: 'Approved contribution' } });
            total += reward.amount;
        }
    }
    const user = await tx.user.update({ where: { id: p.uploadedByUserId }, data: { xp: { increment: total }, allTimeXp: { increment: total } } });
    const definitions = await tx.achievementDefinition.findMany({ where: { isActive: true, category: { in: ['submission', 'schemes'] } } });
    for (const def of definitions) {
        const count = await tx.xpLedger.count({ where: { userId: user.id, eventType: def.category === 'schemes' ? 'MARKING_SCHEME' : 'APPROVED_PAPER', status: 'applied' } });
        const progress = Math.min(count, def.maxProgress);
        const existing = await tx.userAchievement.findUnique({ where: { userId_achievementId: { userId: user.id, achievementId: def.id } } });
        await tx.userAchievement.upsert({ where: { userId_achievementId: { userId: user.id, achievementId: def.id } }, create: { userId: user.id, achievementId: def.id, progress, unlockedAt: progress >= def.maxProgress ? new Date() : null }, update: { progress, unlockedAt: existing?.unlockedAt || (progress >= def.maxProgress ? new Date() : null) } });
    }
    return { awarded: total > 0, levelTitle: levelTitleForXp(user.xp) };
}
export async function achievements(user: User) { authorize(user, {}); const defs = await db.achievementDefinition.findMany({ where: { isActive: true }, orderBy: { id: 'asc' }, include: { userAchievementAchievementId: { where: { userId: user.id } } } }); return defs.map(d => ({ id: d.id, title: d.title, description: d.description, category: d.category, iconName: d.iconName, maxProgress: d.maxProgress, progress: d.userAchievementAchievementId[0]?.progress || 0, unlockedAt: d.userAchievementAchievementId[0]?.unlockedAt?.toISOString() || null })); }
export async function notifications(user: User, q: {
    cursor?: string;
    limit: number;
}) { authorize(user, {}); const id = cursorId(q.cursor); return page(await db.notification.findMany({ where: { userId: user.id }, orderBy: { id: 'desc' }, take: q.limit + 1, ...(id ? { cursor: { id }, skip: 1 } : {}) }), q.limit, n => ({ id: n.id, title: n.title, type: n.type, message: n.message, link: n.link, readAt: n.readAt?.toISOString() || null, createdAt: n.createdAt.toISOString() })); }
export async function readNotification(user: User, id?: string) { authorize(user, {}); await withTransactionRetry(async (tx) => { const r = await tx.notification.updateMany({ where: { userId: user.id, ...(id ? { id } : {}), readAt: null }, data: { readAt: new Date() } }); if (id && !r.count && !await tx.notification.findFirst({ where: { id, userId: user.id } }))
    fail(404, 'NOT_FOUND', 'Notification not found'); }); return { message: 'Notifications marked read' }; }
export async function ledger(admin: User, userId: string, q: {
    cursor?: string;
    limit: number;
}) { authorize(admin, { roles: ['admin'] }); const id = cursorId(q.cursor); return page(await db.xpLedger.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: q.limit + 1, ...(id ? { cursor: { id }, skip: 1 } : {}) }), q.limit, l => ({ id: l.id, userId: l.userId, paperId: l.paperId, amount: Number(l.amount), eventType: l.eventType, reason: l.reason, title: l.title, note: l.note, status: l.status, createdAt: l.createdAt.toISOString() })); }
export async function leaderboard(user: User, q: z.infer<typeof moderationSchemas.leaderboard>) {
    authorize(user, { roles: ['contributor', 'lecturer', 'admin'] });
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    if (q.period === 'week')
        start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    else if (q.period === 'month')
        start.setUTCDate(1);
    const since = q.period === 'all' ? new Date(0) : start;
    // XP is exposed only by this authenticated endpoint and the admin ledger.
    const rows = await db.$queryRaw<Array<{
        id: string;
        username: string;
        xp: bigint;
        all_time_xp: number;
        approved_count: bigint;
        rank: bigint;
    }>> `
  WITH ranked AS (
   SELECT u.id,u.username,u.all_time_xp,COALESCE(SUM(l.amount),0)::INT8 AS xp,
    (SELECT count(*) FROM papers p WHERE p.uploaded_by_user_id=u.id AND p.status='APPROVED' AND p.deleted_at IS NULL)::INT8 AS approved_count
   FROM users u LEFT JOIN xp_ledger l ON l.user_id=u.id AND l.status='applied' AND l.created_at>=${since}
   WHERE u.role IN ('CONTRIBUTOR','LECTURER') AND u.status='ACTIVE' AND u.deleted_at IS NULL
   GROUP BY u.id,u.username,u.all_time_xp
  ), ordered AS (SELECT *,row_number() OVER(ORDER BY xp DESC,id ASC)::INT8 AS rank FROM ranked)
  SELECT * FROM ordered WHERE rank>COALESCE((SELECT rank FROM ordered WHERE id=${cursorId(q.cursor) || '00000000-0000-0000-0000-000000000000'}::UUID),0) ORDER BY rank LIMIT ${q.limit + 1}`;
    return page(rows, q.limit, r => ({ rank: Number(r.rank), username: r.username, levelTitle: levelTitleForXp(Number(r.all_time_xp)), xp: Number(r.xp), approvedCount: Number(r.approved_count) }));
}
