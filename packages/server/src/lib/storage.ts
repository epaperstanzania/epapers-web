import 'server-only';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@epapers/config/server-env';
const client = new S3Client({ region: 'auto', endpoint: env.R2_ENDPOINT, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
export const storage = {
    async presign(bucket: string, key: string, size: number) { return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'application/pdf', ContentLength: size, IfNoneMatch: '*' }), { expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']) }); },
    async head(bucket: string, key: string) { const h = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return { size: h.ContentLength, type: h.ContentType, etag: h.ETag }; },
    async range(bucket: string, key: string, range: string) { const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range })); if (!r.Body)
        throw new Error('Missing object'); return Buffer.from(await r.Body.transformToByteArray()); },
    async stream(bucket: string, key: string) { const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key })); if (!r.Body)
        throw new Error('Missing object'); return r.Body as AsyncIterable<Uint8Array>; },
    async copy(sourceBucket: string, sourceKey: string, bucket: string, key: string) { await client.send(new CopyObjectCommand({ Bucket: bucket, Key: key, CopySource: sourceBucket + '/' + sourceKey.split('/').map(encodeURIComponent).join('/') })); },
    async delete(bucket: string, key: string) { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); },
    async download(bucket: string, key: string, filename: string, expiresIn = 600) { return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: `attachment; filename="${filename}"`, ResponseContentType: 'application/pdf' }), { expiresIn }); },
};
