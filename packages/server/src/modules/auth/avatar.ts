import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, withTransactionRetry } from '@epapers/database';
import { env } from '@epapers/config/server-env';
import { fail } from '@epapers/config/errors';
import { storage } from '@epapers/server/lib/storage';
import { privateUser } from '@epapers/server/modules/auth/dto';

export const MAX_PROFILE_IMAGE_BYTES = 6 * 1024 * 1024;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ImageType = typeof imageTypes[number];
const profileKey = (userId: string, id: string) => `profiles/${userId}/${id}`;
const pendingKey = (userId: string, id: string) => `pending/${userId}/${id}`;
export async function removeProfileImage(userId: string, id: string | null | undefined) {
  if (id && /^p_[a-f0-9]{30}$/.test(id)) await storage.delete(env.R2_PROFILE_BUCKET, profileKey(userId, id)).catch(() => undefined);
}
const signature = (payload: string) => createHmac('sha256', Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64')).update(payload).digest('hex');

export async function presignProfileImage(userId: string, type: string, size: number) {
  if (!imageTypes.includes(type as ImageType) || !Number.isInteger(size) || size < 1 || size > MAX_PROFILE_IMAGE_BYTES)
    fail(422, 'INVALID_IMAGE', 'Choose a JPEG, PNG or WebP image up to 6 MiB');
  const id = `p_${randomBytes(15).toString('hex')}`;
  const expires = Math.floor(Date.now() / 1000) + 300;
  const payload = `${userId}.${id}.${size}.${imageTypes.indexOf(type as ImageType)}.${expires}`;
  const token = `${payload}.${signature(payload)}`;
  return { token, uploadUrl: await storage.presignPut(env.R2_PROFILE_BUCKET, pendingKey(userId, id), size, type), headers: { 'Content-Type': type, 'If-None-Match': '*' } };
}

function validImage(data: Buffer, type: ImageType) {
  if (type === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
}

export async function completeProfileImage(userId: string, token: string) {
  const parts = token.split('.');
  if (parts.length !== 6 || parts[0] !== userId || !/^p_[a-f0-9]{30}$/.test(parts[1]) || !/^\d+$/.test(parts[2]) || !/^[012]$/.test(parts[3]) || !/^\d+$/.test(parts[4]) || !/^[a-f0-9]{64}$/.test(parts[5]))
    fail(422, 'INVALID_IMAGE_TOKEN', 'Image upload expired. Please select the picture again.');
  const payload = parts.slice(0, 5).join('.');
  const expected = Buffer.from(signature(payload), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(parts[5], 'hex')) || Number(parts[4]) < Math.floor(Date.now() / 1000))
    fail(422, 'INVALID_IMAGE_TOKEN', 'Image upload expired. Please select the picture again.');
  const [, id, rawSize, typeIndex] = parts;
  const size = Number(rawSize), type = imageTypes[Number(typeIndex)];
  if (!Number.isInteger(size) || size < 1 || size > MAX_PROFILE_IMAGE_BYTES) fail(422, 'INVALID_IMAGE', 'Image exceeds 6 MiB');
  const key = pendingKey(userId, id);
  let head;
  try { head = await storage.head(env.R2_PROFILE_BUCKET, key); }
  catch { fail(409, 'IMAGE_MISSING', 'Image upload was not found. Try again.'); }
  if (head.size !== size || head.type !== type) fail(422, 'INVALID_IMAGE', 'Image type or size did not match');
  const first = await storage.range(env.R2_PROFILE_BUCKET, key, 'bytes=0-15');
  if (!validImage(first, type)) { await storage.delete(env.R2_PROFILE_BUCKET, key).catch(() => undefined); fail(422, 'INVALID_IMAGE', 'This image format is invalid'); }
  await storage.copy(env.R2_PROFILE_BUCKET, key, env.R2_PROFILE_BUCKET, profileKey(userId, id));
  const previous = await withTransactionRetry(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::UUID FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') fail(401, 'UNAUTHORIZED', 'Authentication required');
    const oldId = user.avatarId;
    const updated = await tx.user.update({ where: { id: userId }, data: { avatarId: id } });
    await tx.auditLog.create({ data: { actorUserId: userId, action: 'PROFILE_IMAGE_UPDATED', targetType: 'user', targetId: userId } });
    return { oldId, user: privateUser(updated) };
  });
  await storage.delete(env.R2_PROFILE_BUCKET, key).catch(() => undefined);
  await removeProfileImage(userId, previous.oldId);
  return previous.user;
}

export async function readProfileImage(id: string) {
  if (!/^p_[a-f0-9]{30}$/.test(id)) fail(404, 'NOT_FOUND', 'Image not found');
  const owner = await db.user.findFirst({ where: { avatarId: id, deletedAt: null, status: 'ACTIVE' }, select: { id: true } });
  if (!owner) fail(404, 'NOT_FOUND', 'Image not found');
  const key = profileKey(owner.id, id);
  const head = await storage.head(env.R2_PROFILE_BUCKET, key);
  if (!head.size || head.size > MAX_PROFILE_IMAGE_BYTES || !imageTypes.includes(head.type as ImageType)) fail(404, 'NOT_FOUND', 'Image not found');
  return { type: head.type!, bytes: await storage.range(env.R2_PROFILE_BUCKET, key, `bytes=0-${head.size - 1}`) };
}
