'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BusyScope, useApiAction } from './BusyScope';

export function UsernameChangeForm() {
  const { currentUser, updateUsername } = useAuth();
  const { busy, run } = useApiAction();
  const [username, setUsername] = useState(currentUser?.username || '');
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(0);
  const nextChangeAt = currentUser?.nextUsernameChangeAt ? new Date(currentUser.nextUsernameChangeAt).getTime() : null;
  const locked = nextChangeAt !== null && nextChangeAt > now;

  useEffect(() => { setUsername(currentUser?.username || ''); }, [currentUser?.username]);
  useEffect(() => {
    setNow(Date.now());
    if (!nextChangeAt) return;
    const delay = nextChangeAt - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), delay + 100);
    return () => window.clearTimeout(timer);
  }, [nextChangeAt]);

  const submit = run(async (event: FormEvent) => {
    event.preventDefault();
    await updateUsername(username.trim());
    setSaved(true);
  });

  return <BusyScope busy={busy}>
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5">
      <label htmlFor="account-username" className="block text-xs font-semibold text-[var(--color-text)]">Username</label>
      <input id="account-username" type="text" value={username} onChange={event => { setUsername(event.target.value); setSaved(false); }}
        minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" autoComplete="username" required disabled={locked}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm font-mono text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-primary)] disabled:opacity-60" />
      <p className="text-xs text-[var(--color-text-muted)]">
        {locked ? `You can change your username again on ${new Date(nextChangeAt!).toLocaleString()}.` : 'You can change your username once every 24 hours. Use 3–30 letters, numbers or underscores.'}
      </p>
      <button type="submit" disabled={locked || !username.trim() || username.trim().toLowerCase() === currentUser?.username.toLowerCase()}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-[var(--color-input)] transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50">Change username</button>
      {saved && <p role="status" className="text-xs font-semibold text-[var(--color-success)]">Username updated.</p>}
    </form>
  </BusyScope>;
}
