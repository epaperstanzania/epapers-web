'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Download, Flag } from 'lucide-react';
import { request } from '../../services/client';
import { Link } from '../../navigation';
import { useAuth } from '../../context/AuthContext';
import { portalOrigins } from '@epapers/config/portals';
import { PaperShareButton } from './PaperShareButton';

export function PaperActions({
  id,
  hasMarkingScheme,
  available,
  title,
  description,
}: {
  id: string;
  hasMarkingScheme: boolean;
  available: boolean;
  title: string;
  description: string;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { isAuthenticated } = useAuth();
  const [reason, setReason] = useState('blurry_scan');
  const [details, setDetails] = useState('');
  const [reported, setReported] = useState(false);
  const shareUrl = new URL(`/papers/${id}`, portalOrigins.web).href;

  useEffect(() => {
    void request(`/papers/${encodeURIComponent(id)}/view`, { method: 'POST' }).catch(() => undefined);
  }, [id]);

  const download = async (kind: 'exam' | 'marking_scheme') => {
    setBusy(true);
    setError('');
    try {
      const result = await request<{ url: string }>(`/papers/${encodeURIComponent(id)}/download-url`, {
        method: 'POST',
        body: { kind },
      });
      const anchor = document.createElement('a');
      anchor.href = result.url;
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The PDF could not be downloaded.');
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request('/flags', {
        method: 'POST',
        auth: true,
        body: { paperId: id, reason, details },
      });
      setReported(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The report could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Paper actions" className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-input)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text)]">Access this paper</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
            Download the exam or share this page with classmates.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !available}
            onClick={() => void download('exam')}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {busy ? 'Preparing…' : 'Download paper'}
          </button>
          {hasMarkingScheme && (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !available}
              onClick={() => void download('marking_scheme')}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Marking scheme
            </button>
          )}
          <PaperShareButton
            url={shareUrl}
            title={title}
            description={description}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
          />
        </div>
      </div>

      {!available && (
        <p role="status" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          The PDF is still being processed. Please check again later.
        </p>
      )}
      {busy && <p role="status" className="text-xs text-[var(--color-text-muted)]">Processing your request…</p>}
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}

      <details className="border-t border-[var(--color-border)] pt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
          <Flag aria-hidden="true" className="h-4 w-4 text-[var(--color-danger)]" />
          Report a problem
        </summary>
        {reported ? (
          <p role="status" className="mt-3 rounded-xl bg-[var(--color-success-soft)] p-3 text-sm text-[var(--color-success)]">
            Your report has been submitted for review.
          </p>
        ) : !isAuthenticated ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            <Link className="font-semibold text-[var(--color-primary)] underline underline-offset-2" to={`/login?returnTo=${encodeURIComponent(`/papers/${id}`)}`}>
              Sign in
            </Link>{' '}
            to submit a report.
          </p>
        ) : (
          <form className="mt-3 grid gap-3 sm:max-w-xl" onSubmit={event => void submitReport(event)}>
            <label className="grid gap-1.5 text-sm font-medium text-[var(--color-text)]">
              Issue
              <select
                className="min-h-11 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3"
                value={reason}
                onChange={event => setReason(event.target.value)}
              >
                <option value="blurry_scan">Blurry scan</option>
                <option value="wrong_module">Wrong module</option>
                <option value="copyright">Copyright</option>
                <option value="duplicate">Duplicate</option>
                <option value="offensive">Offensive content</option>
                <option value="incomplete">Incomplete paper</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-[var(--color-text)]">
              Additional details
              <textarea
                maxLength={2000}
                className="min-h-24 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3 py-2"
                value={details}
                onChange={event => setDetails(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-fit rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Submit report
            </button>
          </form>
        )}
      </details>
    </section>
  );
}
