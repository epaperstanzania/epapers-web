'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { Link } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { AdminStats, AuditLogItem } from '../../types';
import { auditActionLabel } from '../../components/common/AccountActivity';
import {
  Split,
  Flag,
  FileMinus,
  PlusSquare,
  Users,
  HardDrive,
  Activity,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  History,
  FileText,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = apiTask(async () => {
      setLoading(true);
      const [s, logs] = await Promise.all([api.getAdminStats(), api.getAuditLogPage(undefined, 5)]);
      setStats(s);
      setAuditLogs(logs.items);
      setLoading(false);
    }, () => setLoading(false));
    load();
  }, []);

  if (loading) return <PageLoader variant="dashboard" label="Loading content…" />;
  if (!stats) return <p role="alert" className="p-6 text-[var(--color-danger)]">Overview could not be loaded. Refresh to try again.</p>;

  return (
    <div className="min-w-0 space-y-5 sm:space-y-8">
      {/* Top Header */}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/admin/review"
          className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs hover:border-[var(--color-accent)] transition-all"
        >
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mb-2">
            <span className="font-bold uppercase tracking-wider">Pending Moderation</span>
            <span className="w-7 h-7 rounded-lg bg-[var(--color-warning-soft)]  text-[var(--color-warning-text)]  flex items-center justify-center font-bold">
              {stats.pendingPapers}
            </span>
          </div>
          <span className="font-heading font-black text-xl sm:text-3xl text-[var(--color-text)] break-words">
            {stats.pendingPapers} Papers
          </span>
        </Link>

        <Link
          to="/admin/flags"
          className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs hover:border-[var(--color-accent)] transition-all"
        >
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mb-2">
            <span className="font-bold uppercase tracking-wider">Flagged Reports</span>
            <span className="w-7 h-7 rounded-lg bg-[var(--color-danger-soft)]  text-[var(--color-danger)] flex items-center justify-center font-bold">
              {stats.pendingFlags}
            </span>
          </div>
          <span className="font-heading font-black text-xl sm:text-3xl text-[var(--color-text)] break-words">
            {stats.pendingFlags} Reports
          </span>
        </Link>

        <Link
          to="/admin/takedowns"
          className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs hover:border-[var(--color-accent)] transition-all"
        >
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mb-2">
            <span className="font-bold uppercase tracking-wider">Takedown Inquiries</span>
            <span className="w-7 h-7 rounded-lg bg-[var(--color-sidebar)]  text-[var(--color-text)]  flex items-center justify-center font-bold">
              {stats.pendingTakedowns}
            </span>
          </div>
          <span className="font-heading font-black text-xl sm:text-3xl text-[var(--color-text)] break-words">
            {stats.pendingTakedowns} Notice
          </span>

        </Link>

        <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] mb-2">
            <span className="font-bold uppercase tracking-wider">Total Download Volume</span>
            <span className="w-7 h-7 rounded-lg bg-[var(--color-blue-tint)]  text-[var(--color-primary)] flex items-center justify-center font-bold">
              DL
            </span>
          </div>
          <span className="font-heading font-black text-xl sm:text-3xl text-[var(--color-primary)] break-words">
            {stats.totalDownloads.toLocaleString()}
          </span>
          <span className="block text-xs text-[var(--color-neutral)] mt-1">
            Across {stats.totalPapers} active papers
          </span>
        </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/admin/review" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]">
              {stats.pendingPapers} papers awaiting review
            </Link>
            <Link to="/admin/flags" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]">
              {stats.pendingFlags} reports awaiting review
            </Link>
            <Link to="/admin/takedowns" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]">
              {stats.pendingTakedowns} takedown requests awaiting review
            </Link>
            <Link to="/admin/module-requests" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]">
              {stats.pendingModuleReqs} module requests awaiting review
            </Link>
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
