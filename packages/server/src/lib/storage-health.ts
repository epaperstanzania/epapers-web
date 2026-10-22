import 'server-only';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '@epapers/config/server-env';
import type { SystemHealth } from '@epapers/server/modules/admin/health-schema';
const client = new S3Client({ region: 'auto', endpoint: env.R2_ENDPOINT, maxAttempts: 1, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
export async function inspectBucket(role: 'incoming' | 'published', bucket: string): Promise<SystemHealth['storage'][number]> {
  const started = performance.now();
  let objectCount = 0, usedBytes = 0, continuation: string | undefined;
  try {
    const signal = AbortSignal.timeout(8000);
    for (let page = 0; page < 5; page++) {
      const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000, ContinuationToken: continuation }), { abortSignal: signal });
      for (const object of result.Contents ?? []) { objectCount++; usedBytes += object.Size ?? 0; }
      continuation = result.IsTruncated ? result.NextContinuationToken : undefined;
      if (!result.IsTruncated) return { role, bucket, status: 'healthy', latencyMs: Math.round(performance.now() - started), objectCount, usedBytes, complete: true, capacityBytes: null, message: 'Bucket accessible. Current object inventory measured; R2 has no fixed bucket capacity.' };
      if (!continuation) throw new Error('Incomplete inventory');
    }
    return { role, bucket, status: 'healthy', latencyMs: Math.round(performance.now() - started), objectCount, usedBytes, complete: false, capacityBytes: null, message: 'Partial inventory: scanned at most 5,000 objects. Size is a lower bound; remaining capacity is not supplied by R2.' };
  } catch {
    return { role, bucket, status: objectCount ? 'warning' : 'unhealthy', latencyMs: Math.round(performance.now() - started), objectCount: objectCount || null, usedBytes: objectCount ? usedBytes : null, complete: false, capacityBytes: null, message: 'Inventory unavailable or interrupted. Check bucket permissions, configuration and connectivity. No objects were changed.' };
  }
}
