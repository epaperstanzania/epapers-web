import 'server-only';
import { User, Announcement, LecturerVerification } from '@epapers/database/client';
import { levelTitleForXp } from '@epapers/server/lib/levels';
export function adminUser(u: User) { return { id: u.id, username: u.username, fullName: u.fullName, email: u.email, role: u.role.toLowerCase(), status: u.status.toLowerCase(), homeDepartmentId: u.homeDepartmentId, emailVerified: !!u.emailVerifiedAt, lecturerVerified: !!u.lecturerVerifiedAt, xp: u.xp, allTimeXp: u.allTimeXp, levelTitle: levelTitleForXp(u.xp), joinedAt: u.joinedAt.toISOString() }; }
export function announcementDto(a: Announcement) { return { id: a.id, title: a.title, content: a.content, type: a.type, isActive: a.isActive, startsAt: a.startsAt.toISOString(), endsAt: a.endsAt?.toISOString() || null }; }
export function verificationDto(v: LecturerVerification) { return { id: v.id, userId: v.userId, departmentId: v.departmentId, evidence: v.evidence, status: v.status, reviewNote: v.reviewNote, createdAt: v.createdAt.toISOString(), reviewedAt: v.reviewedAt?.toISOString() || null }; }
