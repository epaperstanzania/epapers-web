'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { Link } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { AdminStats, AuditLogItem } from '../../types';
import { auditActionLabel } from '../../components/common/AccountActivity';
import {
  Split,
  Flag,
  FileMinus,
  ArrowRight,
  Download,
  History,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogError, setAuditLogError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setStats(null);
    setAuditLogs([]);
    setAuditLogError(false);

    const loadStats = api.getAdminStats().then(s => {
      if (active) setStats(s);
    });
    const loadAuditLogs = api.getAuditLogPage(undefined, 5).then(logs => {
      if (active) setAuditLogs(logs.items);
    }).catch(() => {
      if (active) {
        setAuditLogs([]);
        setAuditLogError(true);
      }
    });

    void loadStats.catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  if (loading) return <PageLoader variant="dashboard" label="Loading content…" />;
  if (!stats) return (
    <div role="alert" className="p-6 text-[var(--color-danger)]">
      <p>Overview statistics could not be loaded. Refresh to try again.</p>
      <button type="button" className="mt-3 underline" onClick={() => setRetry(value => value + 1)}>Try again</button>
    </div>
  );

  const metricCards = [
    {
      label: 'Pending moderation',
      value: stats.pendingPapers.toLocaleString(),
      detail: 'papers awaiting review',
      icon: Split,
      iconStyle: 'bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]',
      to: '/admin/review',
    },
    {
      label: 'Flagged reports',
      value: stats.pendingFlags.toLocaleString(),
      detail: 'reports need attention',
      icon: Flag,
      iconStyle: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
      to: '/admin/flags',
    },
    {
      label: 'Takedown requests',
      value: stats.pendingTakedowns.toLocaleString(),
      detail: 'requests awaiting review',
      icon: FileMinus,
      iconStyle: 'bg-[var(--color-blue-tint)] text-[var(--color-primary)]',
      to: '/admin/takedowns',
    },
    {
      label: 'Total downloads',
      value: stats.totalDownloads.toLocaleString(),
      detail: `across ${stats.totalPapers.toLocaleString()} approved papers`,
      icon: Download,
      iconStyle: 'bg-[var(--color-cyan-tint)] text-[var(--color-accent-dark)]',
    },
  ];

  return (
    <div className="min-w-0 space-y-5 sm:space-y-7">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Administration</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">Overview</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          Review priority queues and monitor activity across the archive.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="text-xs font-semibold leading-5 text-[var(--color-text-muted)] sm:text-sm">{card.label}</span>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${card.iconStyle}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4">
                <p className="break-words font-heading text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
                  {card.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{card.detail}</p>
              </div>
            </>
          );
          const className = 'flex min-h-36 min-w-0 flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs transition-colors hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)] sm:min-h-40 sm:p-5';

          return card.to ? (
            <Link key={card.label} to={card.to} className={className}>{content}</Link>
          ) : (
            <div key={card.label} className={className}>{content}</div>
          );
        })}
      </div>

      {/* Split section: Action shortcuts & Recent Audit Log */}
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Review Queue preview */}
        <div className="min-w-0 lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
              Moderation Priority Tasks
            </h3>
            <Link
              to="/admin/review"
              className="text-xs font-bold text-[var(--color-primary)]  hover:underline"
            >
              Open Split Queue →
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Papers awaiting review', count: stats.pendingPapers.toLocaleString(), to: '/admin/review' },
              { label: 'Reports awaiting review', count: stats.pendingFlags.toLocaleString(), to: '/admin/flags' },
              { label: 'Takedown requests awaiting review', count: stats.pendingTakedowns.toLocaleString(), to: '/admin/takedowns' },
              { label: 'Module / paper requests awaiting review', count: `${stats.pendingModuleReqs.toLocaleString()} / ${stats.pendingPaperReqs.toLocaleString()}`, to: '/admin/module-requests' },
            ].map((task) => (
              <Link
                key={task.to}
                to={task.to}
                className="flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] sm:p-4"
              >
                <span className="min-w-0 leading-5">{task.label}</span>
                <span className="flex shrink-0 items-center gap-2 text-[var(--color-primary)]">
                  <span>{task.count}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Immutable Audit Trail */}
        <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-base text-[var(--color-text)]  flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--color-neutral)]" />
              <span>Recent Audit</span>
            </h3>
            <Link
              to="/admin/audit"
              className="text-xs text-[var(--color-primary)]  font-semibold hover:underline"
            >
              All Logs →
            </Link>
          </div>

          <div className="space-y-3">
            {auditLogError && <p role="status" className="text-xs text-[var(--color-text-muted)]">Recent audit logs could not be loaded.</p>}
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[var(--color-canvas)]  border border-[var(--color-border)]  text-xs space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--color-text)] ">
                    {auditActionLabel(log.action)}
                  </span>
                  <span className="text-[10px] text-[var(--color-neutral)]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[var(--color-text-muted)]  font-mono text-[11px] truncate">
                  {log.targetType.replaceAll('_', ' ')}
                </p>
                <span className="text-[10px] text-[var(--color-neutral)] block">
                  By @{log.actorUsername || 'System'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
