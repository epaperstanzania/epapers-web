import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@epapers/config/server-env';
const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');
export function encrypt(value: unknown, context: string): string { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(Buffer.from(context)); const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]); return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('@epapers/server/lib'); }
export function decrypt<T>(value: string, context: string): T { const [version, iv, tag, data] = value.split('@epapers/server/lib'); if (version !== 'v1' || !iv || !tag || !data)
    throw new Error('Invalid encrypted record'); const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url')); decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag, 'base64url')); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')) as T; }
