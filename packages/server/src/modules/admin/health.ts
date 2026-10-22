import 'server-only';
import os from 'node:os';
import { statfs } from 'node:fs/promises';
import type { User } from '@epapers/database/client';
import { db } from '@epapers/database';
import { env } from '@epapers/config/server-env';
import { inspectBucket } from '@epapers/server/lib/storage-health';
import { emailConnectivity } from '@epapers/server/lib/email/health';
import { authorize } from '@epapers/server/modules/auth/service';
import { systemHealthSchema, type SystemHealth } from '@epapers/server/modules/admin/health-schema';
let cached: { expires: number; value: SystemHealth } | undefined;
let pending: Promise<SystemHealth> | undefined;
export function workerStatus(value: unknown, now = Date.now()): NonNullable<SystemHealth['queue']>['worker'] {
  const timestamp = value && typeof value === 'object' && 'timestamp' in value ? (value as { timestamp: unknown }).timestamp : null;
  const date = typeof timestamp === 'string' ? new Date(timestamp) : null;
  if (!date || !Number.isFinite(date.getTime()) || date.getTime() > now + 60000) return { status: 'unknown', lastHeartbeatAt: null, ageSeconds: null };
  const ageSeconds = Math.max(0, (now - date.getTime()) / 1000);
  return { status: ageSeconds <= 180 ? 'healthy' : 'unhealthy', lastHeartbeatAt: date.toISOString(), ageSeconds };
}
async function serverMetrics(): Promise<SystemHealth['server']> {
  const first = os.cpus();
  await new Promise(resolve => setTimeout(resolve, 100));
  const second = os.cpus();
  const totals = (cpus: ReturnType<typeof os.cpus>) => cpus.reduce((v, cpu) => ({ idle: v.idle + cpu.times.idle, total: v.total + Object.values(cpu.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
  const a = totals(first), b = totals(second), delta = b.total - a.total;
  const memory = process.memoryUsage(), hostMemoryTotalBytes = os.totalmem(), hostMemoryUsedBytes = Math.max(0, hostMemoryTotalBytes - os.freemem());
  let disk: SystemHealth['server']['disk'] = null;
  try { const value = await statfs(process.cwd()); disk = { totalBytes: value.blocks * value.bsize, usedBytes: (value.blocks - value.bfree) * value.bsize, availableBytes: value.bavail * value.bsize }; } catch { /* Some managed runtimes do not expose a filesystem volume. */ }
  const cpuPercent = delta > 0 ? Math.max(0, Math.min(100, (1 - (b.idle - a.idle) / delta) * 100)) : 0;
  const limit = process.constrainedMemory();
  const memoryPressure = limit > 0 ? memory.rss / limit : hostMemoryUsedBytes / Math.max(1, hostMemoryTotalBytes);
  const diskPressure = disk && disk.totalBytes > 0 ? disk.availableBytes / disk.totalBytes : 1;
  return { status: memoryPressure > .9 || diskPressure < .1 || cpuPercent > 95 ? 'warning' : 'healthy', nodeVersion: process.version, environment: env.NODE_ENV, platform: process.platform, processUptimeSeconds: process.uptime(), hostUptimeSeconds: os.uptime(), cpuCores: second.length, cpuPercent, processMemoryBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal, hostMemoryTotalBytes, hostMemoryUsedBytes, containerMemoryLimitBytes: limit > 0 ? limit : null, loadAverage: process.platform === 'win32' ? null : os.loadavg(), disk };
}
async function databaseMetricsUnbounded(): Promise<Pick<SystemHealth, 'database' | 'queue' | 'email' | 'controls'>> {
  const started = performance.now();
  const email: SystemHealth['email'] = { status: 'unknown', provider: env.EMAIL_PROVIDER, smtpSentToday: null, smtpDailyLimit: env.EMAIL_PROVIDER === 'smtp' ? env.SMTP_DAILY_LIMIT : null, message: 'Queue counters show pending/failed jobs; SMTP reservations do not confirm inbox delivery.' };
  try {
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - started);
    const [groups, overdueLeases, oldestDue, heartbeat, settings, daily] = await Promise.all([
      db.job.groupBy({ by: ['status', 'type'], _count: { _all: true }, where: { status: { in: ['pending', 'running', 'failed', 'expired'] } } }),
      db.job.count({ where: { status: 'running', runAt: { lt: new Date() } } }),
      db.job.findFirst({ where: { status: 'pending', runAt: { lte: new Date() } }, orderBy: { runAt: 'asc' }, select: { runAt: true } }),
      db.appSetting.findUnique({ where: { key: 'workerHeartbeat' } }),
      db.appSetting.findMany({ where: { key: { in: ['readOnly', 'lockdown'] } } }),
      db.$queryRaw<Array<{ sent: bigint }>>`SELECT sent FROM email_daily_counters WHERE day=current_date`
    ]);
    const count = (status: string, emailOnly = false) => groups.filter(row => row.status === status && (!emailOnly || row.type.startsWith('email'))).reduce((n, row) => n + row._count._all, 0);
    const worker = workerStatus(heartbeat?.value), failed = count('failed'), emailFailed = count('failed', true);
    const oldestDueAt = oldestDue?.runAt.toISOString() ?? null;
    const overdue = oldestDue && Date.now() - oldestDue.runAt.getTime() > 300000;
    const queue: NonNullable<SystemHealth['queue']> = { status: worker.status === 'unhealthy' ? 'unhealthy' : worker.status === 'unknown' || failed || overdueLeases || overdue ? 'warning' : 'healthy', pending: count('pending'), running: count('running'), failed, expired: count('expired'), overdueLeases, oldestDueAt, emailPending: count('pending', true), emailFailed, worker, message: 'Historical failed jobs remain counted until an operator resolves them. Pending includes scheduled/throttled jobs; heartbeat indicates worker liveness, not delivery confirmation.' };
    email.status = worker.status === 'unhealthy' && queue.emailPending > 0 ? 'unhealthy' : emailFailed ? 'warning' : 'unknown';
    if (env.EMAIL_PROVIDER === 'smtp') { email.smtpSentToday = Number(daily[0]?.sent ?? 0); if (email.smtpSentToday >= env.SMTP_DAILY_LIMIT) { email.status = 'warning'; email.message = 'Daily SMTP reservation budget reached. Sending is deferred; reservations count attempts, not confirmed inbox delivery.'; } }
    return { database: { status: latencyMs > 1000 ? 'warning' : 'healthy', latencyMs, message: 'Database query and operational metrics completed.' }, queue, email, controls: { readOnly: settings.find(row => row.key === 'readOnly')?.value === true, lockdown: settings.find(row => row.key === 'lockdown')?.value === true } };
  } catch {
    return { database: { status: 'unhealthy', latencyMs: null, message: 'Database probe or operational metrics failed.' }, queue: null, email, controls: null };
  }
}
async function databaseMetrics(): Promise<Pick<SystemHealth, 'database' | 'queue' | 'email' | 'controls'>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([databaseMetricsUnbounded(), new Promise<Pick<SystemHealth, 'database' | 'queue' | 'email' | 'controls'>>(resolve => {
      timer = setTimeout(() => resolve({ database: { status: 'unhealthy', latencyMs: null, message: 'Operational database checks exceeded the 10-second timeout.' }, queue: null, controls: null, email: { status: 'unknown', provider: env.EMAIL_PROVIDER, smtpSentToday: null, smtpDailyLimit: env.EMAIL_PROVIDER === 'smtp' ? env.SMTP_DAILY_LIMIT : null, message: 'Queue metrics unavailable.' } }), 10000);
    })]);
  } finally { clearTimeout(timer); }
}
export async function collectSystemHealth(): Promise<SystemHealth> {
  const [server, data, mail, incoming, published] = await Promise.all([serverMetrics(), databaseMetrics(), emailConnectivity(), inspectBucket('incoming', env.R2_INCOMING_BUCKET), inspectBucket('published', env.R2_PUBLISHED_BUCKET)]);
  const storage = [incoming, published];
  data.email.status = mail.status === 'unhealthy' ? 'unhealthy' : data.email.status === 'warning' || data.email.status === 'unhealthy' ? data.email.status : mail.status;
  data.email.message = mail.message + ' ' + data.email.message;
  const states = [server.status, data.email.status, data.database.status, data.queue?.status ?? 'unknown', ...storage.map(bucket => bucket.status)];
  return systemHealthSchema.parse({ checkedAt: new Date().toISOString(), refreshSeconds: 30, status: states.includes('unhealthy') ? 'unhealthy' : states.includes('warning') || states.includes('unknown') ? 'warning' : 'healthy', server, ...data, storage });
}
export async function systemHealth(admin: User) {
  authorize(admin, { roles: ['admin'] });
  if (cached && cached.expires > Date.now()) return cached.value;
  if (!pending) pending = collectSystemHealth().then(value => { cached = { value, expires: Date.now() + 30000 }; return value; }).finally(() => { pending = undefined; });
  return pending;
}
