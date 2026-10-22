'use client';
import { useEffect, useState } from 'react';
import { subscribePendingRequests } from '../../services/client';
export function RequestProgress() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribePendingRequests(count => {
      if (count > 0) {
        if (!timer) timer = setTimeout(() => setVisible(true), 250);
      } else { clearTimeout(timer); timer = undefined; setVisible(false); }
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);
  return visible ? <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden bg-[var(--color-primary)]/20">
    <span className="sr-only">Connecting to Epapers. Please wait.</span>
    <div className="epapers-request-progress h-full w-1/3 bg-[var(--color-primary)]" />
  </div> : null;
}
