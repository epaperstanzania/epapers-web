'use client';
import { useRef, useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { apiTask } from '../../services/client';

export function useApiAction() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  function run<Args extends unknown[]>(task: (...args: Args) => Promise<void>, settled?: () => void) {
    return apiTask(async (...args: Args) => {
      const event = args[0] as { preventDefault?: () => void } | undefined;
      event?.preventDefault?.();
      if (inFlight.current) return;
      inFlight.current = true; setBusy(true);
      try { await task(...args); }
      finally { inFlight.current = false; setBusy(false); settled?.(); }
    });
  }
  return { busy, run };
}

export function BusyScope({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <fieldset disabled={busy} aria-busy={busy} className="m-0 min-w-0 border-0 p-0 epapers-busy-scope">
    {busy && <div role="status" className="sticky top-16 z-20 mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-surface)] px-4 py-3 text-xs font-semibold text-[var(--color-primary)] shadow-sm">
      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> Working… Please wait.
    </div>}
    {children}
  </fieldset>;
}
