'use client';
import { useEffect, useState } from 'react';
import { request, setSession } from '../../services/client';
import { useAuth } from '../../context/AuthContext';
import { portalOrigins } from '@epapers/config/portals';

type Session = { id: string; createdAt: string; expiresAt: string; current?: boolean };
type ExportPage = { profile: unknown; papers: { items: unknown[]; nextCursor: string | null }; notifications: { items: unknown[]; nextCursor: string | null } };

export function AccountSecurity() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const load = () => request<Session[]>('/auth/sessions', { auth: true }).then(setSessions);

  useEffect(() => { void load().catch(error => setError(error.message)); }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Request failed'); }
    finally { setBusy(false); }
  };

  const exportData = () => run(async () => {
    const papers: unknown[] = [], notifications: unknown[] = [];
    let profile: unknown, paperCursor: string | null = null, notificationCursor: string | null = null;
    let papersDone = false, notificationsDone = false;
    const seen = new Set<string>();
    do {
      const query = new URLSearchParams({ limit: '100' });
      if (paperCursor) query.set('paperCursor', paperCursor);
      if (notificationCursor) query.set('notificationCursor', notificationCursor);
      const result = await request<ExportPage>('/users/me/export?' + query, { auth: true });
      profile = result.profile;
      if (!papersDone) { papers.push(...result.papers.items); paperCursor = result.papers.nextCursor; papersDone = !paperCursor; }
      if (!notificationsDone) { notifications.push(...result.notifications.items); notificationCursor = result.notifications.nextCursor; notificationsDone = !notificationCursor; }
      const key = JSON.stringify([paperCursor, notificationCursor]);
      if (seen.has(key)) throw new Error('The export returned a repeated cursor. Please retry.');
      seen.add(key);
    } while (!papersDone || !notificationsDone);
    const href = URL.createObjectURL(new Blob([JSON.stringify({ profile, papers, notifications }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'epapers-account.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    setNotice('Your account export is ready.');
  });

  return <section className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text)] sm:p-6">
    <h2 className="text-xl font-bold">Sessions and account data</h2>
    {error && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-[var(--color-success-soft)] p-3 text-sm text-[var(--color-success)]">{notice}</p>}
    <ul className="divide-y divide-[var(--color-border)]">
      {sessions.map(session => <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={session.id}>
        <span>Signed in {new Date(session.createdAt).toLocaleDateString()}{session.current ? <span className="ml-2 text-xs text-[var(--color-text-muted)]">Current session</span> : null}</span>
        <button type="button" disabled={busy} className="rounded-md px-2 py-1 font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60" onClick={() => void run(async () => { await request('/auth/sessions/' + encodeURIComponent(session.id), { method: 'DELETE', auth: true }); await load(); })}>Revoke session</button>
      </li>)}
    </ul>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={exportData} className="rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-60">Export my account</button>
      <button type="button" disabled={busy} className="rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-60" onClick={() => void run(async () => { await request('/auth/logout-all', { method: 'POST', auth: true }); setSession(null); window.location.assign(portalOrigins.web + '/login'); })}>Sign out all sessions</button>
    </div>
    {currentUser?.role !== 'admin' && <form className="space-y-3 border-t border-[var(--color-border)] pt-5" onSubmit={event => {
      event.preventDefault();
      if (!window.confirm('Delete and anonymize your account? This cannot be undone.')) return;
      void run(async () => { await request('/users/me/account', { method: 'DELETE', auth: true, body: { password } }); setSession(null); window.location.assign(portalOrigins.web + '/'); });
    }}>
      <h3 className="font-bold">Delete account</h3>
      <p className="text-sm text-[var(--color-text-muted)]">Your profile will be anonymized and all sessions revoked. Archive and audit retention rules still apply.</p>
      <label className="block text-sm font-semibold">Confirm your password
        <input autoComplete="current-password" required type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] p-3 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
      </label>
      <button type="submit" disabled={busy} className="rounded-lg bg-[var(--color-danger)] px-4 py-2.5 text-sm font-bold text-[var(--color-input)] disabled:opacity-60">Delete my account</button>
    </form>}
  </section>;
}
