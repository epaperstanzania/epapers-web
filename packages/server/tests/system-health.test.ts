import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@epapers/database/client';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ query: vi.fn(), groups: vi.fn(), count: vi.fn(), oldest: vi.fn(), setting: vi.fn(), settings: vi.fn(), bucket: vi.fn(), mail: vi.fn(), identity: vi.fn() }));
vi.mock('@epapers/database', () => ({ db: { $queryRaw: mocks.query, job: { groupBy: mocks.groups, count: mocks.count, findFirst: mocks.oldest }, appSetting: { findUnique: mocks.setting, findMany: mocks.settings } } }));
vi.mock('@epapers/server/lib/storage-health', () => ({ inspectBucket: mocks.bucket }));
vi.mock('@epapers/server/lib/email/health', () => ({ emailConnectivity: mocks.mail }));
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/server/modules/auth/service', async () => {
  const { ApiError } = await import('@epapers/config/errors');
  return { authenticate: mocks.identity, authorize: (user: User, options: { roles?: string[] }) => { if (options.roles && !options.roles.includes(user.role.toLowerCase())) throw new ApiError(403, 'FORBIDDEN', 'Access denied'); } };
});
import { collectSystemHealth, workerStatus, systemHealth } from '@epapers/server/modules/admin/health';
import { systemHealthSchema } from '@epapers/server/modules/admin/health-schema';
import { GET } from '../../../apps/web/app/api/v1/admin/health/route';
const admin = { id: 'admin', role: 'ADMIN' } as User;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue([]); mocks.groups.mockResolvedValue([]); mocks.count.mockResolvedValue(0); mocks.oldest.mockResolvedValue(null);
  mocks.setting.mockResolvedValue({ value: { timestamp: new Date().toISOString() } }); mocks.settings.mockResolvedValue([]);
  mocks.mail.mockResolvedValue({ status: 'healthy', message: 'SMTP connection verified; no message sent.' });
  mocks.bucket.mockImplementation(async (role: string, bucket: string) => ({ role, bucket, status: 'healthy', latencyMs: 4, objectCount: 0, usedBytes: 0, complete: true, capacityBytes: null, message: 'Accessible' }));
  mocks.identity.mockResolvedValue({ user: admin, session: { id: 'session' } });
});
describe('system health', () => {
  it('reports real runtime metrics and healthy empty queues/buckets without leaking configuration', async () => {
    const value = await collectSystemHealth();
    expect(systemHealthSchema.safeParse(value).success).toBe(true);
    expect(['healthy', 'warning']).toContain(value.status); expect(value.database.status).toBe('healthy'); expect(value.queue?.status).toBe('healthy'); expect(value.server.processMemoryBytes).toBeGreaterThan(0);
    expect(value.storage[0].usedBytes).toBe(0); expect(value.storage[0].capacityBytes).toBeNull();
    expect(JSON.stringify(value)).not.toMatch(/password|secret|accessKey|DATABASE_URL|hostname|objectKey/i);
  });
  it('preserves other checks when database metrics fail', async () => {
    mocks.query.mockRejectedValue(new Error('secret connection string'));
    const value = await collectSystemHealth();
    expect(value.database.status).toBe('unhealthy'); expect(value.queue).toBeNull(); expect(value.server.processMemoryBytes).toBeGreaterThan(0);
    expect(value.storage).toHaveLength(2); expect(JSON.stringify(value)).not.toContain('secret connection string');
  });
  it('reports stale workers, failed email jobs and partial inventories without inventing capacity', async () => {
    mocks.setting.mockResolvedValue({ value: { timestamp: new Date(Date.now() - 600000).toISOString() } });
    mocks.groups.mockResolvedValue([{ status: 'failed', type: 'email_broadcast', _count: { _all: 2 } }, { status: 'pending', type: 'email', _count: { _all: 3 } }]);
    const value = await collectSystemHealth();
    expect(value.queue?.worker.status).toBe('unhealthy'); expect(value.queue?.emailFailed).toBe(2); expect(value.queue?.emailPending).toBe(3); expect(value.status).toBe('unhealthy');
  });
  it('marks failed storage and SMTP checks unhealthy', async () => {
    mocks.bucket.mockImplementation(async (role: string, bucket: string) => ({ role, bucket, status: 'unhealthy', latencyMs: 8, objectCount: null, usedBytes: null, complete: false, capacityBytes: null, message: 'Unavailable' }));
    mocks.mail.mockResolvedValue({ status: 'unhealthy', message: 'SMTP unavailable' });
    const value = await collectSystemHealth(); expect(value.status).toBe('unhealthy'); expect(value.email.status).toBe('unhealthy');
  });
  it('does not guess worker liveness from old completed jobs', () => {
    expect(workerStatus(null).status).toBe('unknown'); expect(workerStatus({ timestamp: 'invalid' }).status).toBe('unknown');
    expect(workerStatus({ timestamp: new Date().toISOString() }).status).toBe('healthy');
    expect(workerStatus({ timestamp: new Date(Date.now() - 181000).toISOString() }).status).toBe('unhealthy');
  });
  it('keeps health metrics private, rejects non-admins and shares the cached snapshot', async () => {
    await expect(systemHealth({ role: 'CONTRIBUTOR' } as User)).rejects.toThrow('Access denied');
    const response = await GET(new NextRequest('https://api.example.com/api/v1/admin/health', { headers: { Authorization: 'Bearer test' } }));
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    const first = (await response.json()).data; const second = await systemHealth(admin); expect(second.checkedAt).toBe(first.checkedAt);
    mocks.identity.mockResolvedValue({ user: { role: 'CONTRIBUTOR' }, session: { id: 'session' } });
    expect((await GET(new NextRequest('https://api.example.com/api/v1/admin/health', { headers: { Authorization: 'Bearer test' } }))).status).toBe(403);
    expect((await GET(new NextRequest('https://api.example.com/api/v1/admin/health'))).status).toBe(401);
  });
});
