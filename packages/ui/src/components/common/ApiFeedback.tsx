'use client';
import { useEffect, useState } from 'react';
import { CircleAlert, X } from 'lucide-react';
import { subscribeErrors } from '../../services/client';

export function ApiFeedback() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeErrors(error => {
      clearTimeout(timer);
      setMessage(error.message);
      timer = setTimeout(() => setMessage(''), 5000);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);
  return <aside role="alert" aria-atomic="true" className="pointer-events-none fixed inset-x-0 top-4 z-[110] mx-auto w-full max-w-lg px-4 sm:top-6">
    {message && <div className="epapers-error-toast pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-surface)] p-4 shadow-lg">
      <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
      <p className="min-w-0 flex-1 break-words text-sm text-[var(--color-text)]">{message}</p>
      <button type="button" aria-label="Close notification" onClick={() => setMessage('')}
        className="shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>}
  </aside>;
}
