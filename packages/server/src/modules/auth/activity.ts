import 'server-only';
import { db } from '@epapers/database';
import { fail } from '@epapers/config/errors';

export async function recordPageView(userId: string, role: string, path: string) {
  if (!/^\/[A-Za-z0-9_/-]{0,159}$/.test(path) || path.includes('//')) fail(422, 'INVALID_PATH', 'Invalid page path');
  const recent = await db.auditLog.findFirst({ where: { actorUserId: userId, action: 'PAGE_VIEW', targetType: 'portal', targetDescription: path, createdAt: { gte: new Date(Date.now() - 60_000) } }, select: { id: true } });
  if (!recent) await db.auditLog.create({ data: { actorUserId: userId, action: 'PAGE_VIEW', targetType: 'portal', targetDescription: path, metadata: { role: role.toLowerCase() } } });
  return { recorded: true };
}
