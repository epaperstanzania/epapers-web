'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const installed = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    if (installed || window.sessionStorage.getItem('epapers-install-dismissed') === '1') return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setVisible(true);
    };
    const onInstalled = () => { setPrompt(null); setVisible(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      setIos(true);
      setVisible(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || (!prompt && !ios)) return null;

  const dismiss = () => {
    window.sessionStorage.setItem('epapers-install-dismissed', '1');
    setVisible(false);
  };

  return <aside aria-label="Install EPapers" className="fixed inset-x-3 bottom-20 z-[90] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text)] shadow-xl sm:bottom-5">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-active)] text-[var(--color-primary)]"><Download aria-hidden="true" className="h-5 w-5" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold">Install EPapers</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">Open the archive from your home screen.</p>
      {prompt ? <button type="button" onClick={async () => {
        setVisible(false);
        try {
          await prompt.prompt();
          await prompt.userChoice;
        } finally {
          setPrompt(null);
        }
      }} className="mt-3 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">Install app</button>
        : <p className="mt-2 text-xs font-medium">Tap Share, then Add to Home Screen.</p>}
    </div>
    <button type="button" aria-label="Dismiss install suggestion" onClick={dismiss} className="rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X aria-hidden="true" className="h-4 w-4" /></button>
  </aside>;
}
