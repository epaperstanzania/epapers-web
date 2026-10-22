import { z } from 'zod';
const status = z.enum(['healthy', 'warning', 'unhealthy', 'unknown']);
const metric = z.number().finite().nonnegative();
export const systemHealthSchema = z.strictObject({
  checkedAt: z.string().datetime(), status, refreshSeconds: metric,
  server: z.strictObject({ status, nodeVersion: z.string(), environment: z.string(), platform: z.string(), processUptimeSeconds: metric, hostUptimeSeconds: metric, cpuCores: metric, cpuPercent: metric, processMemoryBytes: metric, heapUsedBytes: metric, heapTotalBytes: metric, hostMemoryTotalBytes: metric, hostMemoryUsedBytes: metric, containerMemoryLimitBytes: metric.nullable(), loadAverage: z.array(metric).nullable(), disk: z.strictObject({ totalBytes: metric, usedBytes: metric, availableBytes: metric }).nullable() }),
  database: z.strictObject({ status, latencyMs: metric.nullable(), message: z.string() }),
  storage: z.array(z.strictObject({ role: z.enum(['incoming', 'published']), bucket: z.string(), status, latencyMs: metric, objectCount: metric.nullable(), usedBytes: metric.nullable(), complete: z.boolean(), capacityBytes: z.null(), message: z.string() })),
  queue: z.strictObject({ status, pending: metric, running: metric, failed: metric, expired: metric, overdueLeases: metric, oldestDueAt: z.string().datetime().nullable(), emailPending: metric, emailFailed: metric, worker: z.strictObject({ status, lastHeartbeatAt: z.string().datetime().nullable(), ageSeconds: metric.nullable() }), message: z.string() }).nullable(),
  email: z.strictObject({ status, provider: z.string(), smtpSentToday: metric.nullable(), smtpDailyLimit: metric.nullable(), message: z.string() }),
  controls: z.strictObject({ readOnly: z.boolean(), lockdown: z.boolean() }).nullable()
});
export type SystemHealth = z.infer<typeof systemHealthSchema>;
