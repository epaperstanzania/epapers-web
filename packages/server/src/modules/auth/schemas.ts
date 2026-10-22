import 'server-only';
import { z } from 'zod';
import { passwordError } from '@epapers/config/password-policy';
export const username = z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
const email = z.string().trim().email().max(254).transform(v => v.toLowerCase());
export const password = z.string().min(6, 'Password must contain at least 6 characters.').max(128, 'Password cannot exceed 128 characters.').regex(/^(?=.*[a-zA-Z])(?=.*[0-9]).{6,128}$/, 'Password must include a letter and a number.').superRefine((value, context) => {
    const message = passwordError(value);
    if (message) context.addIssue({ code: 'custom', message });
});
export const schemas = {
    portalGrant: z.strictObject({ redirectUri: z.string().url().max(300), challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }),
    portalExchange: z.strictObject({ redirectUri: z.string().url().max(300), code: z.string().min(40).max(4096), verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }),
    register: z.strictObject({ username, email, password, fullName: z.string().trim().min(2).max(160) }),
    login: z.strictObject({ usernameOrEmail: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) }),
    reauth: z.strictObject({ password: z.string().min(1).max(128) }),
    adminLogin: z.strictObject({ usernameOrEmail: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) }),
    adminVerify: z.strictObject({ challengeToken: z.string().length(43), code: z.string().regex(/^\d{6}$/) }),
    verifyOtp: z.strictObject({ email, code: z.string().regex(/^\d{6}$/) }),
    resend: z.strictObject({ email }),
    forgot: z.strictObject({ email }),
    reset: z.strictObject({ token: z.string().min(20).max(128), password }),
    changePassword: z.strictObject({ currentPassword: z.string().min(1).max(128), password }),
    profile: z.strictObject({ username: username.optional(), fullName: z.string().trim().min(2).max(160).optional(), bio: z.string().max(1000).optional(), avatarId: z.string().regex(/^[a-z0-9_-]{1,32}$/).nullable().optional() }),
    availability: z.strictObject({ username }),
    empty: z.strictObject({}),
    session: z.strictObject({ id: z.uuid() })
};
export const privateProfileSchema = z.strictObject({ id: z.uuid(), username: z.string(), email: z.email(), fullName: z.string(), bio: z.string(), avatarId: z.string().nullable(), role: z.enum(['contributor', 'lecturer', 'admin']), emailVerified: z.boolean(), isLecturerVerified: z.boolean(), homeDepartmentId: z.uuid().nullable(), levelTitle: z.string(), joinedAt: z.iso.datetime() });
export const sessionSchema = z.strictObject({ id: z.uuid(), createdAt: z.iso.datetime(), expiresAt: z.iso.datetime() });
export const adminChallengeSchema = z.strictObject({ verificationRequired: z.literal(true), challengeToken: z.string().length(43), expiresAt: z.iso.datetime(), resendAfter: z.iso.datetime(), message: z.string() });
export const responseSchemas = { adminChallenge: adminChallengeSchema, login: z.union([adminChallengeSchema, z.strictObject({ accessToken: z.string(), user: privateProfileSchema })]), reauth: z.strictObject({ reauthToken: z.string() }), profile: privateProfileSchema, sessionList: z.array(sessionSchema), tokens: z.strictObject({ accessToken: z.string(), user: privateProfileSchema }), message: z.strictObject({ message: z.string() }), availability: z.strictObject({ available: z.boolean() }), error: z.strictObject({ error: z.strictObject({ code: z.string(), message: z.string(), fields: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional() }) }) };
