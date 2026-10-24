'use client';
import { useEffect, useState } from 'react';

export function EmailCodeInput({ value, onChange, resendAfter, onResend, busy, showResend = true }: {
  value: string; onChange: (value: string) => void; resendAfter: string;
  onResend: () => void; busy: boolean;
  showResend?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAfter]);
  const seconds = Math.max(0, Math.ceil((Date.parse(resendAfter) - now) / 1000));
  return <div className="space-y-3">
    <label className="block text-sm font-semibold">Email verification code
      <input type="text" name="code" autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required
        value={value} onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        onPaste={event => { event.preventDefault(); onChange(event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)); }}
        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-center text-xl tracking-[0.4em]" />
    </label>
    <p className="text-xs text-[var(--color-text-muted)]">Paste the full six-digit code from your email. It expires in 10 minutes; check spam if it has not arrived.</p>
    {showResend !== false && <button type="button" disabled={busy || seconds > 0} onClick={onResend}
      className="text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50">
      {seconds > 0 ? `Resend code in ${seconds}s` : 'Resend email code'}
    </button>}
  </div>;
}
