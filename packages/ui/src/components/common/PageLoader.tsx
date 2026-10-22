'use client';
import React from 'react';

type PageLoaderProps = {
  label?: string;
  variant?: 'cards' | 'rows' | 'detail' | 'dashboard';
  compact?: boolean;
  fullPage?: boolean;
  showLogo?: boolean;
};

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`epapers-skeleton rounded-md ${className}`} />
);

/** Shared loading state for route bundles, session restoration and API content. */
export const PageLoader: React.FC<PageLoaderProps> = ({
  label = 'Loading page…', variant = 'cards', compact = false,
  fullPage = false, showLogo = true,
}) => (
  <div role="status" aria-live="polite" aria-busy="true"
    className={`w-full space-y-5 ${fullPage ? 'mx-auto min-h-[70vh] max-w-6xl p-4 sm:p-8' : ''}`}>
    {showLogo ? (
      <div className={`flex flex-col items-center justify-center gap-3 ${compact ? 'py-3' : 'py-8 sm:py-10'}`}>
        <div aria-hidden="true" className={`epapers-loader-logo ${compact ? 'epapers-loader-logo--compact' : ''}`}>
          <span className="epapers-loader-sheet epapers-loader-sheet--back" />
          <span className="epapers-loader-sheet epapers-loader-sheet--front" />
          <img src="/E-Papers-logo.png" alt="" className="relative z-10 h-12 w-12 object-contain" />
        </div>
        <div className="text-center">
          <span className="block font-heading text-lg font-extrabold tracking-tight text-[var(--color-primary)]">EPapers</span>
          <span className="mt-1 block text-xs text-[var(--color-text-muted)]">{label}</span>
        </div>
      </div>
    ) : <span className="sr-only">{label}</span>}
    <div aria-hidden="true" className="space-y-4">
      {!compact && <div className="space-y-3"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="h-3 w-72 max-w-full" /></div>}
      {variant === 'rows' ? (
        <div className="space-y-3">
          {Array.from({ length: compact ? 3 : 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
              <Skeleton className="hidden h-6 w-16 sm:block" />
            </div>
          ))}
        </div>
      ) : variant === 'detail' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:col-span-2">
            <Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" />
            <Skeleton className={compact ? 'h-40 w-full' : 'h-64 w-full sm:h-80'} />
          </div>
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <Skeleton className="h-5 w-1/2" />
            {[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-3 w-full" />)}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
        <div className={`grid gap-4 sm:grid-cols-2 ${variant === 'dashboard' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {Array.from({ length: compact ? 3 : variant === 'dashboard' ? 4 : 6 }, (_, index) => (
            <div key={index} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <Skeleton className="h-10 w-10" /><Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2 pt-2"><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-20" /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
