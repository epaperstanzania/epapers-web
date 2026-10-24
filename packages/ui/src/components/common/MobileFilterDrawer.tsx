'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

type Props = {
  title: string;
  summary?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
};

export function MobileFilterDrawer({ title, summary, children, className = '' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  const close = () => dialogRef.current?.close();
  const show = () => {
    if (!dialogRef.current || dialogRef.current.open) return;
    dialogRef.current.showModal();
    setOpen(true);
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('h2')?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 64rem)');
    const closeOnDesktop = () => { if (media.matches) dialogRef.current?.close(); };
    media.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener('change', closeOnDesktop);
    };
  }, [open]);

  return (
    <div className={`epapers-mobile-filter ${className}`}>
      <button ref={triggerRef} type="button" className="epapers-mobile-filter-trigger" onClick={show} aria-haspopup="dialog" aria-expanded={open}>
        <span className="epapers-mobile-filter-copy">
          <strong><Search aria-hidden="true" size={18} /> Search & filters</strong>
          {summary && <small>{summary}</small>}
        </span>
        <SlidersHorizontal aria-hidden="true" size={20} />
      </button>
      <dialog
        ref={dialogRef}
        className="epapers-mobile-filter-dialog"
        aria-labelledby={titleId}
        onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="epapers-mobile-filter-panel">
          <header className="epapers-mobile-filter-header">
            <h2 id={titleId} tabIndex={-1}>{title}</h2>
            <button type="button" onClick={close} aria-label="Close search and filters"><X aria-hidden="true" size={20} /></button>
          </header>
          <div className="epapers-mobile-filter-body">
            {typeof children === 'function' ? children(close) : children}
          </div>
        </div>
      </dialog>
    </div>
  );
}
