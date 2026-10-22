import 'server-only';
import type { User } from '@epapers/database/client';
import { levelTitleForXp } from '@epapers/server/lib/levels';
export function privateUser(user: User) { return { id: user.id, username: user.username, email: user.email, fullName: user.fullName, bio: user.bio, avatarId: user.avatarId, role: user.role.toLowerCase(), emailVerified: !!user.emailVerifiedAt, isLecturerVerified: !!user.lecturerVerifiedAt, homeDepartmentId: user.homeDepartmentId || null, levelTitle: levelTitleForXp(user.xp), joinedAt: user.joinedAt.toISOString() }; }
