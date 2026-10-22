import 'server-only';
import { z } from 'zod';
import { vercelPortalOrigins } from './portals';
const boolFromString = z.string().transform((value, ctx) => {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    ctx.addIssue({ code: 'custom', message: 'Expected true or false' });
    return z.NEVER;
});
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_ORIGIN: z.string().url(),
    API_ORIGIN: z.string().url().default('http://localhost:3000'),
    COOKIE_DOMAIN: z.string().default(''),
    PORTAL_ORIGINS: z.string().optional(),
    TRUST_PROXY: boolFromString.default(false),
    DATA_ENCRYPTION_KEY: z.string().refine(value => Buffer.from(value, 'base64').length === 32, 'Must be a base64-encoded 32-byte key'),
    DATABASE_URL: z.string().min(1),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_ENDPOINT: z.string().url(),
    R2_INCOMING_BUCKET: z.string().min(3),
    R2_PUBLISHED_BUCKET: z.string().min(3),
    R2_PUBLIC_BASE_URL: z.string().url().or(z.literal('')).default(''),
    JWT_ACCESS_SECRET: z.string().refine(value => Buffer.byteLength(value) >= 32, "Must contain at least 32 bytes"),
    REFRESH_TOKEN_PEPPER: z.string().refine(value => Buffer.byteLength(value) >= 32, "Must contain at least 32 bytes"),
    IP_HASH_SALT: z.string().refine(value => Buffer.byteLength(value) >= 32, "Must contain at least 32 bytes"),
    EMAIL_FROM: z.string().default('Epapers <no-reply@example.com>'),
    SMTP_DAILY_LIMIT: z.coerce.number().int().positive().default(450),
    EMAIL_PROVIDER: z.enum(['smtp', 'resend']),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: boolFromString.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().email().or(z.string().regex(/^.+ <[^<>]+>$/)).optional(),
    RESEND_API_KEY: z.string().optional(),
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
    DAILY_UPLOAD_QUOTA: z.coerce.number().int().positive().default(20),
    SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(600).max(600).default(600),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
}).superRefine((value, ctx) => {
    const origins = (value.PORTAL_ORIGINS || value.APP_ORIGIN).split(',').map(origin => origin.trim());
    for (const origin of origins) {
        try {
            const url = new URL(origin);
            if (url.origin !== origin || url.username || url.password || !['http:', 'https:'].includes(url.protocol) || (value.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error();
            if (value.NODE_ENV === 'production' && !['https://epapers.co.tz','https://contributor.epapers.co.tz','https://lecturer.epapers.co.tz','https://console.epapers.co.tz','https://epapertz.vercel.app','https://epapertz-contributor.vercel.app','https://epapertz-lecturer.vercel.app','https://epapertz-admin.vercel.app'].includes(origin)) throw new Error();
        } catch { ctx.addIssue({ code: 'custom', path: ['PORTAL_ORIGINS'], message: 'Expected exact trusted portal origins' }); }
    }
    if (value.NODE_ENV === 'production' && !['', '.epapers.co.tz', 'epapers.co.tz'].includes(value.COOKIE_DOMAIN)) ctx.addIssue({ code: 'custom', path: ['COOKIE_DOMAIN'], message: 'Invalid cookie domain' });
    if (origins.some(origin => origin.endsWith('.vercel.app')) && value.COOKIE_DOMAIN) ctx.addIssue({ code: 'custom', path: ['COOKIE_DOMAIN'], message: 'Vercel portals require host-only cookies' });
    if (value.EMAIL_PROVIDER === 'smtp') {
        for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const) {
            if (!value[key])
                ctx.addIssue({ code: 'custom', path: [key], message: 'Required when EMAIL_PROVIDER=smtp' });
        }
    }
    if (value.EMAIL_PROVIDER === 'resend' && !value.RESEND_API_KEY) {
        ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Required when EMAIL_PROVIDER=resend' });
    }
});
const vercelEnv = process.env.VERCEL === '1';
const runtimeEnv = vercelEnv ? {
    ...process.env,
    APP_ORIGIN: vercelPortalOrigins.web,
    API_ORIGIN: vercelPortalOrigins.web,
    PORTAL_ORIGINS: Object.values(vercelPortalOrigins).join(','),
    COOKIE_DOMAIN: '',
    TRUST_PROXY: 'false',
} : process.env;
const result = schema.safeParse(runtimeEnv);
if (!result.success) {
    const missing = result.error.issues.map((issue) => `${issue.path.join('.')}: invalid or missing value`).join('\n');
    throw new Error(`Invalid backend environment configuration:\n${missing}`);
}
export const env = result.data;
