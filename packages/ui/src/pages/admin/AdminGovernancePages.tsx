'use client';
import { AdminSystemHealth } from './AdminSystemHealth';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import { MobileFilterDrawer } from '../../components/common/MobileFilterDrawer';
import { auditActionLabel } from '../../components/common/AccountActivity';
import { apiTask } from '../../services/client';
import { AdminSystemSettings } from './AdminSystemSettings';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLogItem, ModuleRequest, Paper, PaperRequestItem, UserProfile } from '../../types';
import {
  History,
  Radio,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Lock,
  PlusSquare,
  FileStack,
  Trash2,
  GraduationCap,
} from 'lucide-react';

export const AdminAuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = apiTask(async () => {
      setLoading(true);
      const page = await api.getAuditLogPage();
      setLogs(page.items);
      setNextCursor(page.nextCursor);
      setLoading(false);
    }, () => setLoading(false));
    load();
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError('');
    try { const page = await api.getAuditLogPage(nextCursor); setLogs(previous => [...previous, ...page.items]); setNextCursor(page.nextCursor); }
    catch { setLoadError('Older events could not be loaded. Please try again.'); }
    finally { setLoadingMore(false); }
  };

  if (loading) return <PageLoader variant="rows" label="Loading content…" />;
  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-[var(--color-accent)]" />
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            User Activity & Audit Log
          </h1>
        </div>
        {loadError && <p role="alert" className="px-4 text-xs text-[var(--color-danger)]">{loadError}</p>}
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Important account, submission, and data-change events only.
        </p>
      </div>

      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="epapers-responsive-table w-full text-left text-xs">
            <thead className="bg-[var(--color-canvas)]  border-b border-[var(--color-border)]  text-[var(--color-neutral)] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] ">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-input)] ">
                  <td data-label="Timestamp" className="p-4 font-mono text-[var(--color-neutral)]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td data-label="User" className="p-4 font-bold text-[var(--color-text)] ">
                    {log.actorUsername ? `@${log.actorUsername}` : 'System'}
                  </td>
                  <td data-label="Action" className="p-4">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--color-sidebar)]  text-[var(--color-primary)] ">
                      {auditActionLabel(log.action)}
                    </span>
                  </td>
                  <td data-label="Target" className="p-4 capitalize text-[var(--color-text-muted)]">
                    {log.targetType.replaceAll('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nextCursor && <div className="border-t border-[var(--color-border)] p-4 text-center"><button type="button" disabled={loadingMore} onClick={() => { void loadMore(); }} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load older events'}</button></div>}
      </div>
    </div>
  );
};

export const AdminSystemHealthPage: React.FC = () => <AdminSystemHealth />;

export const AdminCommunicationsPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [broadcasted, setBroadcasted] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const handleBroadcast = run(async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createAnnouncement(
      {
        title,
        content,
        type: 'info',
        active: true,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      }, { sendEmail, requestId }
    );
    setBroadcasted(true);
    setTitle('');
    setContent('');
    setRequestId(crypto.randomUUID());
    setTimeout(() => setBroadcasted(false), 3000);
  });

  return (<BusyScope busy={busy}><div className="max-w-2xl space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Radio className="w-6 h-6 text-[var(--color-accent)]" />
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            Broadcast Notifications
          </h1>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Broadcast bulletin alerts to all students browsing past examination repositories.
        </p>

        {broadcasted && (
          <div className="mt-4 p-3 bg-[var(--color-success-soft)] text-[var(--color-success)] rounded-lg text-xs font-semibold">
            ✓ Broadcast saved. Portal notifications and selected emails are queued for delivery.
          </div>
        )}

        <form onSubmit={handleBroadcast} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-neutral)] mb-1">
              Banner Headline
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => { setTitle(e.target.value); setRequestId(crypto.randomUUID()); }}
              placeholder="e.g. End of Semester Examination Window Announced"
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)] "
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-neutral)] mb-1">
              Message Content
            </label>
            <textarea
              rows={3}
              required
              value={content}
              onChange={(e) => { setContent(e.target.value); setRequestId(crypto.randomUUID()); }}
              placeholder="Details regarding upcoming moderation milestones..."
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)] "
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 text-xs">
            <input type="checkbox" checked={sendEmail} onChange={event => { setSendEmail(event.target.checked); setRequestId(crypto.randomUUID()); }} className="mt-0.5" />
            <span><span className="block font-semibold">Also send to contributors’ email inboxes</span><span className="mt-1 block text-[var(--color-text-muted)]">Verified contributor emails only. Delivery is queued and paced to avoid repeated messages. Portal notifications are always included.</span></span>
          </label>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-surface)] font-bold rounded-xl text-xs hover:bg-[var(--color-primary-dark)]"
          >
            {busy ? 'Queueing broadcast…' : 'Broadcast announcement'}
          </button>
        </form>
      </div>
    </div></BusyScope>);
};

export const AdminSettingsPage: React.FC = () => <AdminSystemSettings />;

export const AdminModuleRequestsPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ModuleRequest[]>([]);
  const [paperRequests, setPaperRequests] = useState<PaperRequestItem[]>([]);
  const [requestType, setRequestType] = useState<'module' | 'paper'>('module');
  const [loadError, setLoadError] = useState(false);

  const loadReqs = apiTask(async () => {
    const [modules, papers] = await Promise.allSettled([api.getModuleRequests(), api.getPaperRequests()]);
    if (modules.status === 'fulfilled') setRequests(modules.value);
    if (papers.status === 'fulfilled') setPaperRequests(papers.value);
    setLoadError(modules.status === 'rejected' || papers.status === 'rejected');
  }, () => setLoading(false));

  useEffect(() => {
    loadReqs();
  }, []);

  const handleResolve = run(async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'approved' && !window.confirm('Approve this module request and add it to the curriculum?')) return;
    await api.resolveModuleRequest(id, status);
    loadReqs();
  });
  const handlePaperResolve = run(async (id: string, status: 'fulfilled' | 'dismissed') => {
    const note = status === 'dismissed' ? window.prompt('Reason for dismissing this paper request:') : '';
    if (note === null) return;
    await api.resolvePaperRequest(id, status, note || '');
    loadReqs();
  });

  if (loading) return <PageLoader variant="rows" />;
  return (<BusyScope busy={busy}><div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs">
        <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
          Archive Requests
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Review missing curriculum modules and requested examination papers.
        </p>
      </div>

      <div role="tablist" aria-label="Request category" className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-input)] p-1">
        {(['module', 'paper'] as const).map(type => <button key={type} type="button" role="tab" aria-selected={requestType === type} onClick={() => setRequestType(type)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${requestType === type ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}>{type === 'module' ? `Modules (${requests.filter(item => item.status === 'pending').length})` : `Papers (${paperRequests.filter(item => item.status === 'pending').length})`}</button>)}
      </div>
      {loadError && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">Some requests could not be loaded. Retry this page after checking the API and database migration.</p>}

      {requestType === 'module' ? <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl divide-y divide-[var(--color-border)] ">
        {!requests.length && <p className="p-5 text-sm text-[var(--color-text-muted)]">No module requests yet.</p>}
        {requests.map((r) => (
          <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-blue-tint)] text-[var(--color-primary)]  ">
                  {r.moduleCode}
                </span>
                <strong className="text-sm text-[var(--color-text)] ">{r.moduleName}</strong>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{r.description || r.notes}</p>
              <span className="text-[10px] text-[var(--color-neutral)] mt-1 block">
                {r.departmentName} · {r.programName || 'Program not specified'} · {r.academicYear || 'Year not specified'} · Semester {r.semester || '—'}
              </span>
              <span className="text-[10px] text-[var(--color-neutral)] mt-0.5 block">Requested by @{r.requestedBy}</span>
            </div>

            <div className="flex items-center gap-2">
              {r.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleResolve(r.id, 'approved')}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--color-success)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-success)]"
                  >
                    Approve & Create Module
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, 'rejected')}
                    className="px-3.5 py-1.5 rounded-lg border border-[var(--color-input-border)]  text-xs font-semibold text-[var(--color-text-muted)]"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-[var(--color-neutral)] uppercase">{r.status}</span>
              )}
            </div>
          </div>
        ))}
      </div> : <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {!paperRequests.length && <p className="p-5 text-sm text-[var(--color-text-muted)]">No paper requests yet.</p>}
        {paperRequests.map(item => <div key={item.id} className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold text-[var(--color-text)]">{item.moduleCode} · {item.category === 'TEST' ? `Test ${item.testNumber}` : item.category} · {item.academicYear}{item.wantsMarkingScheme ? ' · Marking scheme' : ''}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.moduleName} · Semester {item.semester} · {item.requestedBy ? `@${item.requestedBy}` : 'Guest'} · {new Date(item.createdAt).toLocaleDateString()}</p>
            {item.description && <p className="text-xs text-[var(--color-text-muted)]">{item.description}</p>}
            {item.reviewNote && <p className="text-xs text-[var(--color-text-muted)]">Review: {item.reviewNote}</p>}
          </div>
          {item.status === 'pending' ? <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handlePaperResolve(item.id, 'fulfilled')} className="min-h-10 rounded-lg bg-[var(--color-success)] px-3 text-xs font-bold text-white">Mark fulfilled</button>
            <button type="button" onClick={() => handlePaperResolve(item.id, 'dismissed')} className="min-h-10 rounded-lg border border-[var(--color-input-border)] px-3 text-xs font-semibold text-[var(--color-text)]">Dismiss</button>
          </div> : <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">{item.status}</span>}
        </div>)}
      </div>}
    </div></BusyScope>);
};

export const AdminPapersDirectoryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = apiTask(async () => {
      const all = await api.getAllPapers(true);
      setPapers(all);
    }, () => setLoading(false));
    load();
  }, []);

  const filtered = papers.filter(
    (p) =>
      p.moduleCode.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader variant="rows" />;
  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            Examination Papers Directory
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Full repository catalogue across all statuses (Approved, Pending, Rejected).
          </p>
        </div>

        <input
          type="text"
          aria-label="Search papers by module or title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter papers..."
          className="hidden lg:block bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] w-64 focus:outline-hidden"
        />
        <MobileFilterDrawer title="Search exam papers" summary={search || `${filtered.length} papers`}>
          {(close) => <div className="epapers-mobile-filter-fields">
            <label>Module code or paper title
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. COE07201" />
            </label>
            <div className="epapers-mobile-filter-actions">
              <button type="button" onClick={() => setSearch('')}>Clear</button>
              <button type="button" onClick={close}>Show {filtered.length} results</button>
            </div>
          </div>}
        </MobileFilterDrawer>
      </div>

      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="epapers-responsive-table w-full text-left text-xs">
            <thead className="bg-[var(--color-canvas)]  border-b border-[var(--color-border)]  text-[var(--color-neutral)] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Module Code & Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Session</th>
                <th className="p-4">Status</th>
                <th className="p-4">Uploader</th>
                <th className="p-4 text-right">Downloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] ">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-input)] ">
                  <td data-label="Paper" className="p-4">
                    <span className="font-mono font-bold text-sm text-[var(--color-text)]  block">
                      {p.moduleCode}
                    </span>
                    <span className="text-[var(--color-text-muted)] line-clamp-1">{p.title}</span>
                  </td>
                  <td data-label="Type" className="p-4 font-bold">{p.category}</td>
                  <td data-label="Session" className="p-4">{p.academicYear} · Sem {p.semester}</td>
                  <td data-label="Status" className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.status === 'APPROVED' ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' :
                      p.status === 'PENDING' ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]' : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td data-label="Uploader" className="p-4">@{p.uploadedBy.username}</td>
                  <td data-label="Downloads" className="p-4 text-right font-mono font-bold">{p.downloadsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminLecturersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const load = apiTask(async () => {
    const list = await api.getAllUsers();
    setUsers(list.filter((u) => u.role === 'lecturer' || u.isLecturerVerified));
  }, () => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading) return <PageLoader variant="rows" />;
  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[var(--color-primary)] " />
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            Verified Faculty  
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((u) => (
          <div key={u.id} className="min-w-0 p-4 sm:p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <span className="font-bold text-sm text-[var(--color-text)]  block">
                @{u.username}
              </span>
              <p className="text-xs text-[var(--color-neutral)] font-mono">{u.email}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{u.bio}</p>
            </div>
            <span className="text-xs font-bold text-[var(--color-success)] bg-[var(--color-success-soft)] px-2.5 py-1 rounded-lg shrink-0">
              ✓ Verified
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
