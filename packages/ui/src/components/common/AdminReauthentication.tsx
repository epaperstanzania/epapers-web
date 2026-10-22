'use client';
import { useEffect, useRef, useState } from 'react';
import { registerReauthentication, request } from '../../services/client';
import { PasswordInput } from './PasswordInput';
import { EmailCodeInput } from './EmailCodeInput';
import type { EmailChallenge } from '../../services/auth';

export function AdminReauthentication() {
  const pending = useRef<{ resolve: (proof: string) => void; reject: (error: Error) => void } | null>(null);
  const [open, setOpen] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(''), [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<EmailChallenge | null>(null);
  useEffect(() => {
    const unregister = registerReauthentication(() => new Promise((resolve, reject) => {
      if (pending.current) { reject(new Error('Finish the current confirmation first.')); return; }
      pending.current = { resolve, reject }; setError(''); setPassword(''); setCode(''); setChallenge(null); setOpen(true);
    }));
    return () => { unregister(); pending.current?.reject(new Error('Confirmation cancelled.')); pending.current = null; };
  }, []);
  const sendCode = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await request<EmailChallenge>('/auth/reauth', { method: 'POST', auth: true, retry: false, body: { password } });
      setChallenge(result); setCode('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The code could not be sent.'); }
    finally { setBusy(false); }
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
    <form className="w-full max-w-sm space-y-4 rounded-xl bg-[var(--color-surface)] p-6" onSubmit={async event => {
      event.preventDefault();
      if (!challenge) { await sendCode(); return; }
      if (busy) return;
      setBusy(true); setError('');
      try {
        const result = await request<{ reauthToken: string }>('/auth/reauth/verify', { method: 'POST', auth: true, retry: false, body: { challengeToken: challenge.challengeToken, code } });
        setPassword(''); setCode(''); setChallenge(null); pending.current?.resolve(result.reauthToken); pending.current = null; setOpen(false);
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Confirmation failed.'); }
      finally { setBusy(false); }
    }}>
      <h2 id="reauth-title" className="font-bold">Confirm administrator action</h2>
      <fieldset disabled={busy}>
        {challenge ? <EmailCodeInput value={code} onChange={setCode} resendAfter={challenge.resendAfter} onResend={() => void sendCode()} busy={busy} />
          : <PasswordInput value={password} onChange={setPassword} />}
      </fieldset>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-3"><button disabled={busy} type="submit" className="rounded border px-4 py-2">{busy ? 'Please wait…' : challenge ? 'Verify & confirm' : 'Send email code'}</button>
      <button type="button" disabled={busy} onClick={() => { pending.current?.reject(new Error('Action cancelled.')); pending.current = null; setPassword(''); setCode(''); setChallenge(null); setOpen(false); }}>Cancel</button></div>
    </form>
  </div>;
}
