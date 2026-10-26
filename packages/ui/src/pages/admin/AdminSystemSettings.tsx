'use client';
import { useEffect, useState } from 'react';
import { ChangePasswordForm } from '../../components/common/ChangePasswordForm';
import { UsernameChangeForm } from '../../components/common/UsernameChangeForm';
import { PageLoader } from '../../components/common/PageLoader';
import { request, sensitiveRequest } from '../../services/client';

type Settings = { lockdown?: boolean; readOnly?: boolean; bannerMessage?: string; retentionDays?: number };
export function AdminSystemSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request<Settings>('/admin/settings', { auth: true }).then(data => { if (active) { setSettings(data); setLoaded(true); } })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);
  if (!loaded && !error) return <PageLoader variant="detail" label="Loading settings…" />;
  return <section className="max-w-3xl space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
    <h1 className="text-xl font-bold">Site settings</h1>
    <p className="text-sm text-[var(--color-text-muted)]">Changes apply to the backend and require an audit reason and administrator confirmation.</p>
    {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
    {message && <p role="status" className="text-sm text-[var(--color-success)]">{message}</p>}
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); if (!loaded || busy) return; setBusy(true); setError(''); setMessage('');
      try {
        const data = await sensitiveRequest<Settings>('/admin/settings', { method: 'PATCH', body: { ...settings, reason } });
        setSettings(data); setMessage('Backend settings saved.'); setReason('');
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Settings could not be saved.'); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={!loaded || busy} className="space-y-4">
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.lockdown === true} onChange={e => setSettings({ ...settings, lockdown: e.target.checked })} />Lockdown: pause registration and uploads</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.readOnly === true} onChange={e => setSettings({ ...settings, readOnly: e.target.checked })} />Read only: pause affected writes</label>
        <label className="block text-sm">Public banner<input value={settings.bannerMessage || ''} maxLength={500} onChange={e => setSettings({ ...settings, bannerMessage: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Retention (days)<input type="number" min={1} max={3650} value={settings.retentionDays ?? 90} onChange={e => setSettings({ ...settings, retentionDays: Number(e.target.value) })} className="ml-3 rounded border p-2" /></label>
        <label className="block text-sm">Audit reason<textarea value={reason} required minLength={1} maxLength={2000} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <button type="submit" className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white">{busy ? 'Saving…' : 'Save settings'}</button>
      </fieldset>
    </form>
    <UsernameChangeForm />
    <ChangePasswordForm />
  </section>;
}
