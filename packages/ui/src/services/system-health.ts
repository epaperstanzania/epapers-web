import { request } from './client';
export type HealthStatus = 'healthy' | 'warning' | 'unhealthy' | 'unknown';
export interface SystemHealth {
  checkedAt: string; status: HealthStatus; refreshSeconds: number;
  server: { status: HealthStatus; nodeVersion: string; environment: string; platform: string; processUptimeSeconds: number; hostUptimeSeconds: number; cpuCores: number; cpuPercent: number; processMemoryBytes: number; heapUsedBytes: number; heapTotalBytes: number; hostMemoryTotalBytes: number; hostMemoryUsedBytes: number; containerMemoryLimitBytes: number | null; loadAverage: number[] | null; disk: { totalBytes: number; usedBytes: number; availableBytes: number } | null };
  database: { status: HealthStatus; latencyMs: number | null; message: string };
  storage: { role: 'incoming' | 'published'; bucket: string; status: HealthStatus; latencyMs: number; objectCount: number | null; usedBytes: number | null; complete: boolean; capacityBytes: null; message: string }[];
  queue: { status: HealthStatus; pending: number; running: number; failed: number; expired: number; overdueLeases: number; oldestDueAt: string | null; emailPending: number; emailFailed: number; worker: { status: HealthStatus; lastHeartbeatAt: string | null; ageSeconds: number | null }; message: string } | null;
  email: { status: HealthStatus; provider: string; smtpSentToday: number | null; smtpDailyLimit: number | null; message: string };
  controls: { readOnly: boolean; lockdown: boolean } | null;
}
export const getSystemHealth = () => request<SystemHealth>('/admin/health', { auth: true });
