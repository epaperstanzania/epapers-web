import { beforeEach, describe, expect, it, vi } from 'vitest';
const send = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: class { send = send; }, ListObjectsV2Command: class { constructor(public input: unknown) {} } }));
import { inspectBucket } from '@epapers/server/lib/storage-health';
beforeEach(() => vi.clearAllMocks());
describe('R2 health inventory', () => {
  it('sums bytes across pages and reports complete inventory', async () => {
    send.mockResolvedValueOnce({ Contents: [{ Size: 10 }, { Size: 20 }], IsTruncated: true, NextContinuationToken: 'next' }).mockResolvedValueOnce({ Contents: [{ Size: 30 }], IsTruncated: false });
    const result = await inspectBucket('incoming', 'incoming');
    expect(result).toMatchObject({ status: 'healthy', objectCount: 3, usedBytes: 60, complete: true, capacityBytes: null });
    expect(send.mock.calls[1][0].input.ContinuationToken).toBe('next');
  });
  it('bounds listing and marks storage size as partial', async () => {
    send.mockResolvedValue({ Contents: [{ Size: 12 }], IsTruncated: true, NextContinuationToken: 'next' });
    const result = await inspectBucket('published', 'published');
    expect(send).toHaveBeenCalledTimes(5); expect(result.complete).toBe(false); expect(result.usedBytes).toBe(60); expect(result.capacityBytes).toBeNull();
  });
  it('does not expose SDK errors or pretend an unreachable bucket is empty', async () => {
    send.mockRejectedValue(new Error('secret credential string'));
    const result = await inspectBucket('incoming', 'incoming');
    expect(result.status).toBe('unhealthy'); expect(result.usedBytes).toBeNull(); expect(result.objectCount).toBeNull(); expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('reports a partial failed scan as warning instead of presenting full usage', async () => {
    send.mockResolvedValueOnce({ Contents: [{ Size: 12 }], IsTruncated: true, NextContinuationToken: 'next' }).mockRejectedValueOnce(new Error('timeout'));
    expect(await inspectBucket('published', 'published')).toMatchObject({ status: 'warning', complete: false, usedBytes: 12 });
  });
});
