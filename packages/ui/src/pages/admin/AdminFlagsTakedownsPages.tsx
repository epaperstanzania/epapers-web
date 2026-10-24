'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FlaggedReport, TakedownRequest } from '../../types';
import { Flag, FileMinus, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from '@epapers/ui/navigation';

export const AdminFlagsPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [flags, setFlags] = useState<FlaggedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFlags = apiTask(async () => {
    setLoading(true);
    const res = await api.getFlags();
    setFlags(res);
    setLoading(false);
  }, () => setLoading(false));

  useEffect(() => {
    loadFlags();
  }, []);

  const handleResolve = run(async (id: string, status: 'resolved' | 'dismissed') => {
    await api.resolveFlag(id, status);
    loadFlags();
  }, () => setLoading(false));

  if (loading) return <PageLoader variant="rows" label="Loading content…" />;
  return (<BusyScope busy={busy}><div className="space-y-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-[var(--color-danger)]" />
            <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
              Flagged Examination Reports
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Peer and faculty reports citing illegible scans, wrong course codes, or duplicates.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl overflow-hidden shadow-xs">
        <div className="divide-y divide-[var(--color-border)] ">
          {flags.map((flag) => (
            <div key={flag.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
                    {flag.reason.toUpperCase()}
                  </span>
                  <strong className="text-sm text-[var(--color-text)] ">
                    {flag.moduleCode} — {flag.paperTitle}
                  </strong>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] ">
                  {flag.details}
                </p>
                <div className="text-[11px] text-[var(--color-neutral)]">
                  Reported by @{flag.reportedBy} on {new Date(flag.reportedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {flag.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleResolve(flag.id, 'resolved')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-success)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-success)] cursor-pointer"
                    >
                      Resolve & Require Re-scan
                    </button>
                    <button
                      onClick={() => handleResolve(flag.id, 'dismissed')}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-input-border)]  text-[var(--color-text-muted)]  text-xs font-semibold hover:bg-[var(--color-sidebar)] cursor-pointer"
                    >
                      Dismiss Report
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-[var(--color-neutral)] capitalize">
                    Status: {flag.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div></BusyScope>);
};

export const AdminTakedownsPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [takedowns, setTakedowns] = useState<TakedownRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTakedowns = apiTask(async () => {
    setLoading(true);
    const res = await api.getTakedowns();
    setTakedowns(res);
    setLoading(false);
  }, () => setLoading(false));

  useEffect(() => {
    loadTakedowns();
  }, []);

  const handleAction = run(async (id: string, action: 'approved_removed' | 'rejected') => {
    if (action === 'approved_removed' && !window.confirm('Withdraw this paper from the public archive?')) return;
    await api.resolveTakedown(id, action, action === 'approved_removed' ? 'Removal request reviewed and approved' : 'Removal request reviewed and rejected');
    loadTakedowns();
  }, () => setLoading(false));

  if (loading) return <PageLoader variant="rows" label="Loading content…" />;
  return (<BusyScope busy={busy}><div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <FileMinus className="w-5 h-5 text-[var(--color-neutral)]" />
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            Epapers Takedown Requests
          </h1>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Formal faculty and departmental removal notices for unreleased or restricted assessments.
        </p>
      </div>

      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl overflow-hidden shadow-xs divide-y divide-[var(--color-border)] ">
        {takedowns.map((tk) => (
          <div key={tk.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
                  {tk.moduleCode}
                </span>
                <strong className="text-sm text-[var(--color-text)] ">
                  {tk.paperTitle}
                </strong>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] ">
                <strong>Grounds:</strong> {tk.reason}
              </p>
              <div className="text-[11px] text-[var(--color-neutral)]">
                Requester: {tk.requesterName} ({tk.requesterEmail}) · {tk.affiliation}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {tk.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleAction(tk.id, 'approved_removed')}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-danger-soft-hover)] cursor-pointer"
                  >
                    Withdraw Paper from Archive
                  </button>
                  <button
                    onClick={() => handleAction(tk.id, 'rejected')}
                    className="px-3.5 py-1.5 rounded-lg border border-[var(--color-input-border)]  text-xs font-semibold hover:bg-[var(--color-sidebar)] cursor-pointer"
                  >
                    Reject Takedown
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-[var(--color-neutral)] uppercase">
                  {tk.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div></BusyScope>);
};
