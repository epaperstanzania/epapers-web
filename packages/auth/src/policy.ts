import 'server-only';
import { env } from '@epapers/config/server-env';
export const trustedOrigins = new Set(env.PORTAL_ORIGINS ? env.PORTAL_ORIGINS.split(',').map(value => value.trim()) : [env.APP_ORIGIN]);
export function trustedOrigin(origin: string | null): origin is string { return origin !== null && trustedOrigins.has(origin); }
export function validMutation(origin: string | null, client: string | null) { return trustedOrigin(origin) && client === 'web'; }
export function refreshCookieOptions() {
  return { httpOnly: true, secure: env.NODE_ENV !== 'development', sameSite: 'lax' as const, path: '/api/v1/auth', ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}) };
}
