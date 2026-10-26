'use client';
import React, { useState } from 'react';
import { Paper } from '../../types';
import { CategoryChip, StatusChip, LecturerBadge } from './Chips';
import { Download } from 'lucide-react';
import { Link } from '@epapers/ui/navigation';
import { portalOrigins } from '@epapers/config/portals';
import { api } from '../../services/api';
import { PaperShareButton } from './PaperShareButton';

interface PaperCardProps {
  paper: Paper;
  showStatus?: boolean;
  detailBase?: string;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, showStatus = false, detailBase = '/papers' }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const shareUrl = new URL(`/papers/${paper.id}`, portalOrigins.web).href;

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
          <PaperShareButton
            url={shareUrl}
            title={`${paper.moduleCode} examination paper`}
            description={`${paper.moduleName} · ${paper.academicYear}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-blue-tint)]"
          />
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
    </div>
  );
};
