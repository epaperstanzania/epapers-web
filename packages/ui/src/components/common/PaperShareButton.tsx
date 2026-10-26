'use client';

import { useId, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Share2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PaperShareButtonProps {
  url: string;
  title: string;
  description: string;
  label?: string;
  className?: string;
}

export function PaperShareButton({
  url,
  title,
  description,
  label = 'Share',
  className = '',
}: PaperShareButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const urlId = useId();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const openDialog = () => {
    if (!dialogRef.current || dialogRef.current.open) return;
    setCopied(false);
    setError('');
    dialogRef.current.showModal();
  };

  const closeDialog = () => dialogRef.current?.close();

  const copyLink = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError('Could not copy automatically. Select and copy the link below.');
    }
  };

  const share = async () => {
    setError('');
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: description, url });
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError('Could not open the share options. You can copy the link instead.');
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label={`${label} ${title}`}
        className={className}
      >
        <Share2 aria-hidden="true" className="h-4 w-4" />
        <span>{label}</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          setError('');
          if (buttonRef.current?.getClientRects().length) buttonRef.current.focus();
        }}
        onClick={event => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        className="m-auto max-h-[min(90dvh,44rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text)] shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="space-y-5 p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Share paper</p>
              <h2 id={titleId} className="mt-1 font-heading text-xl font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">{description}</p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close share dialog"
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)]"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <div className="grid justify-items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 text-center">
            <div className="rounded-xl bg-white p-2">
              <QRCodeSVG value={url} size={208} level="M" marginSize={2} title={`QR code linking to ${title}`} />
            </div>
            <p className="text-xs leading-5 text-slate-600">Scan with a phone camera to open this paper.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor={urlId} className="text-xs font-semibold text-[var(--color-text-muted)]">Shareable link</label>
            <input
              id={urlId}
              readOnly
              value={url}
              onFocus={event => event.currentTarget.select()}
              className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-text)]"
            />
          </div>

          {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
          {copied && <p role="status" className="text-sm font-semibold text-[var(--color-success)]">Link copied to clipboard.</p>}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Share options
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
