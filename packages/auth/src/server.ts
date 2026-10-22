import 'server-only';
import type { User } from '@epapers/database/client';
import { db } from '@epapers/database';
import { fail } from '@epapers/config/errors';
import { verifyAccess } from './jwt';
function active(user: User | null): asserts user is User { if (!user || user.deletedAt || user.status !== 'ACTIVE')
    fail(401, 'UNAUTHORIZED', 'Authentication required'); }

export async function authenticate(token: string) {
    let claims;
    try {
        claims = await verifyAccess(token);
    }
    catch {
        fail(401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (typeof claims.sid !== 'string' || typeof claims.sub !== 'string')
        fail(401, 'UNAUTHORIZED', 'Authentication required');
    const session = await db.userSession.findUnique({ where: { id: claims.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.rotatedAt || session.expiresAt <= new Date() || session.userId !== claims.sub)
        fail(401, 'UNAUTHORIZED', 'Authentication required');
    active(session.user);
    if (session.user.role === 'ADMIN' && !session.adminEmailVerifiedAt)
        fail(401, 'UNAUTHORIZED', 'Verify your administrator sign-in by email');
    if (session.user.role.toLowerCase() !== claims.role)
        fail(401, 'UNAUTHORIZED', 'Please log in again');
    return { user: session.user, session };
}

export function authorize(user: User, options: {
    roles?: string[];
    requireVerifiedEmail?: boolean;
    scope?: {
        departmentId: string;
    };
}) {
    active(user);
    if (options.roles && !options.roles.includes(user.role.toLowerCase()))
        fail(403, 'FORBIDDEN', 'Access denied');
    if (options.requireVerifiedEmail && !user.emailVerifiedAt)
        fail(403, 'EMAIL_UNVERIFIED', 'Verify your email first');
    if (options.scope && user.role !== 'ADMIN' && (user.role !== 'LECTURER' || !user.lecturerVerifiedAt || user.homeDepartmentId !== options.scope.departmentId))
        fail(403, 'FORBIDDEN', 'Department access denied');
}
