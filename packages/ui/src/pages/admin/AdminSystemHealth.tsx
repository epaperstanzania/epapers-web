'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, RefreshCw, Server, Database, HardDrive, Mail, Layers } from 'lucide-react';
import { PageLoader } from '../../components/common/PageLoader';
import { getSystemHealth, type SystemHealth, type HealthStatus } from '../../services/system-health';
const bytes = (value: number | null) => {
  if (value === null) return 'Unavailable';
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'], index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  return (value / 1024 ** index).toFixed(index ? 1 : 0) + ' ' + units[index];
};
const duration = (seconds: number) => seconds >= 86400 ? Math.floor(seconds / 86400) + 'd ' + Math.floor(seconds % 86400 / 3600) + 'h' : seconds >= 3600 ? Math.floor(seconds / 3600) + 'h ' + Math.floor(seconds % 3600 / 60) + 'm' : Math.floor(seconds / 60) + 'm';
function Badge({ status }: { status: HealthStatus }) {
  const color = status === 'healthy' ? 'text-[var(--color-success)]' : status === 'unhealthy' ? 'text-[var(--color-danger)]' : status === 'warning' ? 'text-amber-600' : 'text-[var(--color-text-muted)]';
  return <span className={'rounded-full border border-current px-2.5 py-1 text-[10px] font-bold uppercase ' + color}>{status}</span>;
}
function Metric({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-lg bg-[var(--color-canvas)] p-3"><dt className="text-xs text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{children}</dd></div>;
}
function Card({ title, status, icon, children }: { title: string; status: HealthStatus; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-bold">{icon}{title}</h2><Badge status={status} /></div>{children}</section>;
}
function Meter({ label, used, total }: { label: string; used: number; total: number }) {
  const percent = total > 0 ? Math.min(100, used / total * 100) : 0;
  return <div className="mt-4"><div className="mb-1 flex justify-between gap-3 text-xs"><span>{label}</span><span>{percent.toFixed(1)}%</span></div><progress aria-label={label} max={100} value={percent} className="h-2 w-full accent-[var(--color-primary)]" /></div>;
}
export function AdminSystemHealth() {
  const [data, setData] = useState<SystemHealth | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const inFlight = useRef(false), mounted = useRef(false);
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { const result = await getSystemHealth(); if (mounted.current) { setData(result); setError(''); } }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Health checks could not be loaded.'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onVisible = () => { if (!document.hidden) void refresh(); };
    const timer = setInterval(onVisible, 30000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  const s = data?.server, q = data?.queue;
  return <div className="space-y-5 text-[var(--color-text)]" aria-busy={busy}>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Activity className="h-6 w-6 text-[var(--color-primary)]" />System Health</h1><p className="mt-1 text-xs text-[var(--color-text-muted)]">Live operational checks. Refreshes every 30 seconds while visible; backend results are cached for 30 seconds.</p></div><button type="button" disabled={busy} onClick={() => { void refresh(); }} className="flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"><RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} />{busy ? 'Checking?' : 'Refresh checks'}</button></header>
    {error && <div role="alert" className="rounded-lg border border-[var(--color-danger)]/30 p-4 text-sm text-[var(--color-danger)]">{error}{data && ' The metrics below are from the previous successful check.'}</div>}
    {!data && !error && <PageLoader variant="cards" label="Checking system health?" />}
    {data && s && <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><span className="text-sm font-semibold">Overall operational status <span className="ml-2"><Badge status={data.status} /></span></span><span className="text-xs text-[var(--color-text-muted)]">Checked: {new Date(data.checkedAt).toLocaleString()}</span></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Server & runtime" status={s.status} icon={<Server className="h-5 w-5" />}><dl className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Process uptime">{duration(s.processUptimeSeconds)}</Metric><Metric label="Host uptime">{duration(s.hostUptimeSeconds)}</Metric><Metric label="CPU cores">{s.cpuCores}</Metric><Metric label="CPU snapshot">{s.cpuPercent.toFixed(1)}%</Metric><Metric label="Runtime">{s.nodeVersion}</Metric><Metric label="Environment">{s.environment} / {s.platform}</Metric><Metric label="Process RAM (RSS)">{bytes(s.processMemoryBytes)}</Metric><Metric label="Heap used / total">{bytes(s.heapUsedBytes)} / {bytes(s.heapTotalBytes)}</Metric><Metric label="Container memory limit">{bytes(s.containerMemoryLimitBytes)}</Metric><Metric label="Host RAM used / total">{bytes(s.hostMemoryUsedBytes)} / {bytes(s.hostMemoryTotalBytes)}</Metric><Metric label="Load avg (1/5/15m)">{s.loadAverage?.map(n => n.toFixed(2)).join(' / ') ?? 'Not exposed on this platform'}</Metric></dl><Meter label="Reported host RAM usage" used={s.hostMemoryUsedBytes} total={s.hostMemoryTotalBytes} /><p className="mt-3 text-xs text-[var(--color-text-muted)]">Metrics reflect the host/container visible to this API process. CPU is a short sample; these checks are not a full server monitoring history.</p></Card>
        <Card title="Database" status={data.database.status} icon={<Database className="h-5 w-5" />}><dl className="grid grid-cols-2 gap-3"><Metric label="Query latency">{data.database.latencyMs === null ? 'Unavailable' : data.database.latencyMs + ' ms'}</Metric><Metric label="Read-only mode">{data.controls ? data.controls.readOnly ? 'Enabled' : 'Disabled' : 'Unavailable'}</Metric><Metric label="Registration lockdown">{data.controls ? data.controls.lockdown ? 'Enabled' : 'Disabled' : 'Unavailable'}</Metric></dl><p className="mt-3 text-xs text-[var(--color-text-muted)]">{data.database.message}</p></Card>
        <Card title="Worker & job queue" status={q?.status ?? 'unknown'} icon={<Layers className="h-5 w-5" />}>{q ? <><dl className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Worker heartbeat"><Badge status={q.worker.status} /></Metric><Metric label="Heartbeat age">{q.worker.ageSeconds === null ? 'Not recorded' : Math.floor(q.worker.ageSeconds) + 's'}</Metric><Metric label="Pending jobs">{q.pending}</Metric><Metric label="Running jobs">{q.running}</Metric><Metric label="Failed jobs">{q.failed}</Metric><Metric label="Expired jobs">{q.expired}</Metric><Metric label="Overdue leases">{q.overdueLeases}</Metric><Metric label="Oldest due job">{q.oldestDueAt ? new Date(q.oldestDueAt).toLocaleString() : 'None'}</Metric></dl><p className="mt-3 text-xs text-[var(--color-text-muted)]">{q.message}</p></> : <p className="text-sm">Queue metrics unavailable.</p>}</Card>
        <Card title="Email delivery" status={data.email.status} icon={<Mail className="h-5 w-5" />}><dl className="grid grid-cols-2 gap-3"><Metric label="Provider">{data.email.provider.toUpperCase()}</Metric><Metric label="Pending / failed">{q ? q.emailPending + ' / ' + q.emailFailed : 'Unavailable'}</Metric><Metric label="SMTP reserved today">{data.email.smtpSentToday ?? 'Unavailable'}</Metric><Metric label="Daily SMTP budget">{data.email.smtpDailyLimit ?? 'Not applicable'}</Metric></dl>{data.email.smtpSentToday !== null && data.email.smtpDailyLimit !== null && <Meter label="Daily SMTP budget usage" used={data.email.smtpSentToday} total={data.email.smtpDailyLimit} />}<p className="mt-3 text-xs text-[var(--color-text-muted)]">{data.email.message}</p></Card>
        {data.storage.map(bucket => <Card key={bucket.role} title={bucket.role === 'incoming' ? 'Incoming R2 bucket' : 'Published R2 bucket'} status={bucket.status} icon={<HardDrive className="h-5 w-5" />}><dl className="grid grid-cols-2 gap-3"><Metric label="Bucket">{bucket.bucket}</Metric><Metric label="Probe duration">{bucket.latencyMs} ms</Metric><Metric label="Objects counted">{bucket.objectCount === null ? 'Unavailable' : bucket.objectCount.toLocaleString() + (bucket.complete ? '' : '+ (partial)')}</Metric><Metric label="Object storage used">{bytes(bucket.usedBytes)}{bucket.usedBytes !== null && !bucket.complete ? ' (lower bound)' : ''}</Metric><Metric label="Inventory">{bucket.complete ? 'Complete' : 'Partial / unavailable'}</Metric><Metric label="Capacity / free space">Elastic; quota not reported</Metric></dl><p className="mt-3 text-xs text-[var(--color-text-muted)]">{bucket.message}</p></Card>)}
        <Card title="Server workspace volume" status={!s.disk ? 'unknown' : s.disk.availableBytes / Math.max(1, s.disk.totalBytes) < .1 ? 'warning' : 'healthy'} icon={<HardDrive className="h-5 w-5" />}>{s.disk ? <><dl className="grid grid-cols-3 gap-3"><Metric label="Total">{bytes(s.disk.totalBytes)}</Metric><Metric label="Used">{bytes(s.disk.usedBytes)}</Metric><Metric label="Available">{bytes(s.disk.availableBytes)}</Metric></dl><Meter label="Disk usage" used={s.disk.usedBytes} total={s.disk.totalBytes} /></> : <p className="text-sm">Filesystem metrics are not exposed by this runtime.</p>}<p className="mt-3 text-xs text-[var(--color-text-muted)]">The volume containing the API working directory. Managed deployment disks may be temporary; papers are stored in R2.</p></Card>
      </div>
    </>}
  </div>;
}
