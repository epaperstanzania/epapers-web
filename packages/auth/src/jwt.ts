import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '@epapers/config/server-env';
const key = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
export function signAccess(user: {
    id: string;
    role: string;
}, sid: string) { return new SignJWT({ role: user.role.toLowerCase(), sid }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuer('epapers-api').setAudience('epapers-spa').setIssuedAt().setJti(randomUUID()).setExpirationTime(user.role === 'ADMIN' ? '5m' : '15m').sign(key); }
export async function verifyAccess(token: string) { return (await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'epapers-api', audience: 'epapers-spa', requiredClaims: ['sub', 'role', 'sid', 'iat', 'exp', 'jti'] })).payload; }
export function signReauthentication(userId: string, sid: string) { return new SignJWT({ role: 'admin', sid, purpose: 'reauth' }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuer('epapers-api').setAudience('epapers-admin-reauth').setIssuedAt().setJti(randomUUID()).setExpirationTime('5m').sign(key); }
export async function verifyReauthentication(token: string) { return (await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'epapers-api', audience: 'epapers-admin-reauth', requiredClaims: ['sub', 'sid', 'purpose', 'iat', 'exp', 'jti'] })).payload; }
