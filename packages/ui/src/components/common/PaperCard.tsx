'use client';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Paper } from '../../types';
import { CategoryChip, StatusChip, LecturerBadge } from './Chips';
import { Check, Copy, Download, ExternalLink, Share2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from '@epapers/ui/navigation';
import { portalOrigins } from '@epapers/config/portals';
import { api } from '../../services/api';

interface PaperCardProps {
  paper: Paper;
  showStatus?: boolean;
  detailBase?: string;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, showStatus = false, detailBase = '/papers' }) => {
  const shareDialogRef = useRef<HTMLDialogElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const shareTitleId = useId();
  const shareUrlId = useId();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  const shareUrl = new URL(`/papers/${paper.id}`, portalOrigins.web).href;

  useEffect(() => () => {
    if (shareDialogRef.current?.open) shareDialogRef.current.close();
  }, []);

  const openShareDialog = () => {
    if (!shareDialogRef.current || shareDialogRef.current.open) return;
    setCopied(false);
    setShareError('');
    shareDialogRef.current.showModal();
  };

  const closeShareDialog = () => shareDialogRef.current?.close();

  const handleCopyLink = async () => {
    setShareError('');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setShareError('Could not copy automatically. Select and copy the link below.');
    }
  };

  const handleNativeShare = async () => {
    setShareError('');
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: `${paper.moduleCode} examination paper`,
        text: `${paper.moduleName} · ${paper.academicYear}`,
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareError('Could not open the share options. You can copy the link instead.');
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true); setDownloadError('');
    try {
      await api.recordDownload(paper.id);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (reason) { setDownloadError(reason instanceof Error ? reason.message : 'Download failed.'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--color-primary)] transition-colors relative">
      {downloadError && <p role="alert" className="mb-2 text-xs text-[var(--color-danger)]">{downloadError}</p>}
      <div>
        {/* Top Header metadata */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryChip category={paper.category} testNumber={paper.testNumber} size="sm" />
            <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">
              {paper.academicYear}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">·</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              Sem {paper.semester}
            </span>
          </div>

          {showStatus ? (
            <StatusChip status={paper.status} />
          ) : (
            paper.verifiedLecturerBadge && <LecturerBadge />
          )}
        </div>

        {/* Module Code & Title */}
        <Link to={`${detailBase}/${paper.id}`} className="block group-hover:text-[var(--color-primary)]">
          <h3 className="font-bold text-base text-[var(--color-text)] leading-tight">
            {paper.moduleCode}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] line-clamp-1 mt-0.5">
            {paper.moduleName}
          </p>
        </Link>

        {/* Program tag & Scheme Badge */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {paper.programName}
          </span>
          {paper.hasMarkingScheme && (
            <span className="inline-flex items-center text-[11px] font-semibold text-[var(--color-success)] bg-[var(--color-success-soft)] px-2 py-0.5 rounded border border-[var(--color-success)]/20">
              Marking Scheme
            </span>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-mono text-[var(--color-text-muted)]">
          <button
            ref={shareButtonRef}
            type="button"
            onClick={openShareDialog}
            aria-haspopup="dialog"
            aria-label={`Share ${paper.moduleCode}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-blue-tint)]"
          >
            <Share2 aria-hidden="true" className="h-4 w-4" />
            <span>Share</span>
          </button>
          <span>·</span>
          <span className="truncate">{paper.downloadsCount.toLocaleString()} dl</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
              downloaded
                ? 'bg-[var(--color-success)] text-[var(--color-surface)]'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-input)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloaded ? 'Saved' : downloading ? 'Saving...' : 'PDF'}</span>
          </button>
        </div>
      </div>
      <dialog
        ref={shareDialogRef}
        aria-labelledby={shareTitleId}
        onClose={() => {
          setShareError('');
          if (shareButtonRef.current?.getClientRects().length) shareButtonRef.current.focus();
        }}
        onClick={event => {
          if (event.target === event.currentTarget) closeShareDialog();
        }}
        className="m-auto max-h-[min(90dvh,44rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text)] shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="space-y-5 p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Share paper</p>
              <h2 id={shareTitleId} className="mt-1 font-heading text-xl font-bold">{paper.moduleCode}</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">{paper.moduleName} · {paper.academicYear}</p>
            </div>
            <button
              type="button"
              onClick={closeShareDialog}
              aria-label="Close share dialog"
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)]"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <div className="grid justify-items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 text-center">
            <div className="rounded-xl bg-white p-2">
              <QRCodeSVG
                value={shareUrl}
                size={208}
                level="M"
                marginSize={2}
                title={`QR code linking to ${paper.moduleCode} examination paper`}
              />
            </div>
            <p className="text-xs leading-5 text-slate-600">Scan with a phone camera to open this paper.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor={shareUrlId} className="text-xs font-semibold text-[var(--color-text-muted)]">Shareable link</label>
            <input
              id={shareUrlId}
              readOnly
              value={shareUrl}
              onFocus={event => event.currentTarget.select()}
              className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-text)]"
            />
          </div>

          {shareError && <p role="alert" className="text-sm text-[var(--color-danger)]">{shareError}</p>}
          {copied && <p role="status" className="text-sm font-semibold text-[var(--color-success)]">Link copied to clipboard.</p>}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Share options
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};
