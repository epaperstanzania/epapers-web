import 'server-only';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { env } from '@epapers/config/server-env';
import { fail } from '@epapers/config/errors';
import { passwordError } from '@epapers/config/password-policy';
export const opaqueToken = () => randomBytes(32).toString('base64url');
export const otp = () => randomInt(0, 1000000).toString().padStart(6, '0');
export const tokenHash = (token: string) => createHmac('sha256', env.REFRESH_TOKEN_PEPPER).update(token).digest('hex');
export const ipHash = (ip: string) => createHmac('sha256', env.IP_HASH_SALT).update(ip).digest('hex');
export async function hashPassword(password: string) {
    const error = passwordError(password);
    if (error) fail(422, 'WEAK_PASSWORD', error);
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
}
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
export function verifyTotp(secret: string, code: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of secret.toUpperCase()) {
        const i = alphabet.indexOf(c);
        if (i < 0)
            return false;
        bits += i.toString(2).padStart(5, '0');
    }
    const key = Buffer.from(bits.match(/.{8}/g)?.map(b => parseInt(b, 2)) ?? []);
    for (let offset = -1; offset <= 1; offset++) {
        const counter = Buffer.alloc(8);
        counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
        const mac = createHmac('sha1', key).update(counter).digest();
        const start = mac[19] & 15;
        const expected = ((mac.readUInt32BE(start) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
        if (code.length === 6 && timingSafeEqual(Buffer.from(code), Buffer.from(expected)))
            return true;
    }
    return false;
}
