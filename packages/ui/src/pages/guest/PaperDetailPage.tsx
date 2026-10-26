'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { Paper, FlaggedReport } from '../../types';
import { ApiForm } from '../../components/common/ApiForm';
import { CategoryChip, StatusChip, LecturerBadge } from '../../components/common/Chips';
import { UsernameTile } from '../../components/common/UsernameTile';
import { PaperShareButton } from '../../components/common/PaperShareButton';
import { portalOrigins } from '@epapers/config/portals';
import {
  Download,
  Share2,
  Flag,
  FileCheck2,
  Calendar,
  Layers,
  CheckCircle,
  Eye,
  AlertTriangle,
  X,
  Send,
  BookOpen,
} from 'lucide-react';

export const PaperDetailPage: React.FC<{ contributor?: boolean }> = ({ contributor = false }) => {
  const { busy, run } = useApiAction();
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<FlaggedReport['reason']>('blurry_scan');
  const [flagDetails, setFlagDetails] = useState('');
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  const shareUrl = paper ? new URL(`/papers/${paper.id}`, portalOrigins.web).href : '';

  useEffect(() => {
    async function fetchPaper() {
      if (!id) return;
      setLoading(true);
      try {
        setPaper(await api.getPaper(id));
      } catch {
        setError('Paper details could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchPaper();
  }, [id]);

  const handleFlagSubmit = run(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paper) return;
    setFlagSubmitted(true);
    setTimeout(() => {
      setFlagSubmitted(false);
      setFlagModalOpen(false);
      setFlagDetails('');
    }, 1500);
  }, () => setLoading(false));

  if (loading) return <PageLoader variant="detail" label="Loading content…" />;

  if (error) {
    return <div role="alert" className="mx-auto max-w-xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text)]">{error}<button onClick={() => window.location.reload()} className="ml-2 font-semibold text-[var(--color-primary)] underline">Retry</button></div>;
  }

  if (!paper) {
    return (
      <div className="p-8 text-center bg-[var(--color-surface)]  rounded-xl border border-[var(--color-border)] ">
        <h2 className="font-heading font-bold text-lg text-[var(--color-text)] ">
          Paper Not Found
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          The requested examination document does not exist or has been removed.
        </p>
        <Link
          to={contributor ? '/browse' : '/search'}
          className="mt-4 inline-block px-4 py-2 bg-[var(--color-primary)] text-[var(--color-surface)] rounded-lg text-xs font-semibold"
        >
          Back to Search
        </Link>
      </div>
    );
  }

  return (<BusyScope busy={busy}><div className="space-y-6">
      {/* Paper Header Card */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryChip category={paper.category} testNumber={paper.testNumber} />
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-sidebar)]  text-[var(--color-text)] ">
              {paper.academicYear}
            </span>
            <span className="text-xs text-[var(--color-neutral)]">·</span>
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              Semester {paper.semester}
            </span>
            {paper.verifiedLecturerBadge && <LecturerBadge />}
          </div>

          <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-text)]  leading-tight">
            {paper.moduleCode}: {paper.title}
          </h1>

          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]  flex-wrap">
            <Link
              to={contributor ? `/browse?q=${encodeURIComponent(paper.moduleCode)}` : `/modules/${paper.moduleId}`}
              className="text-[var(--color-primary)]  font-semibold hover:underline"
            >
              {paper.moduleName}
            </Link>
            <span>·</span>
            <Link
              to={contributor ? `/browse?departmentId=${paper.departmentId}` : `/departments/${paper.departmentId}`}
              className="hover:underline"
            >
              {paper.departmentName}
            </Link>
            <span>·</span>
            <span>{paper.programName}</span>
          </div>
        </div>

        {/* Quick Meta Strip & Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)] ">
            <span>{paper.fileSize}</span>
            <span>·</span>
            <span>{paper.downloadsCount} downloads</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PaperShareButton
              url={shareUrl}
              title={paper.title}
              description={`${paper.moduleCode} · ${paper.moduleName} · ${paper.academicYear}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-input)]"
            />
            <button
              onClick={() => setFlagModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)]  text-[var(--color-text-muted)]  text-xs font-medium hover:bg-[var(--color-input)]  transition-colors cursor-pointer"
              title="Report an issue or flag this document"
            >
              <Flag className="w-3.5 h-3.5 text-[var(--color-danger)]" />
              <span>Flag Paper</span>
            </button>
          </div>
        </div>
      </div>

      {/* Uploader Attribution Card */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UsernameTile
            username={paper.uploadedBy.username}
            size="md"
            avatarId={paper.uploadedBy.avatarId}
          />
          <div>
            <p className="text-xs text-[var(--color-neutral)]">Archived by community contributor</p>
            <div className="flex items-center gap-2">
              <Link
                to={`/u/${paper.uploadedBy.username}`}
                className="font-bold text-sm text-[var(--color-text)]  hover:text-[var(--color-primary)] "
              >
                @{paper.uploadedBy.username}
              </Link>
              {paper.verifiedLecturerBadge && (
                <span className="text-[10px] bg-[var(--color-blue-tint)] text-[var(--color-primary)]   font-bold px-1.5 py-0.2 rounded">
                  Faculty
                </span>
              )}
            </div>
          </div>
        </div>

        <span className="text-xs text-[var(--color-neutral)]">
          Archived {new Date(paper.uploadedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Flag / Issue Report Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-text)]/20">
          <div className="relative w-full max-w-md bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-sm">
            <button
              onClick={() => setFlagModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-[var(--color-neutral)] hover:text-[var(--color-text-muted)]  cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-[var(--color-danger)]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
                Flag Examination Paper
              </h3>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Help DIT archivists keep past papers legible and accurate. Moderation reviews all reports within 24 hours.
            </p>

            {flagSubmitted ? (
              <div className="p-4 bg-[var(--color-success-soft)]  text-[var(--color-success)]  rounded-xl text-xs font-semibold text-center">
                ✓ Report submitted to DIT Review Board. Thank you!
              </div>
            ) : (
              <ApiForm requireAuth endpoint="/flags" payload={() => ({ paperId: paper.id, reason: flagReason, details: flagDetails })} onSubmit={handleFlagSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text)] ">
                    Reason for Report
                  </label>
                  <select
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value as FlaggedReport['reason'])}
                    className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
                  >
                    <option value="blurry_scan">Blurry or Illegible Scan</option>
                    <option value="wrong_module">Wrong Module Code / Mismatched Title</option>
                    <option value="incomplete">Incomplete Pages or Truncated Section</option>
                    <option value="duplicate">Duplicate Paper Already Exists</option>
                    <option value="copyright">Restricted Faculty Assessment Material</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text)] ">
                    Specific Details (e.g. Page numbers, question numbers)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={flagDetails}
                    onChange={(e) => setFlagDetails(e.target.value)}
                    placeholder="Describe the issue with this scan..."
                    className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFlagModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--color-text-muted)]  hover:bg-[var(--color-sidebar)]  cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[var(--color-danger-soft)] hover:bg-[var(--color-danger-soft-hover)] text-[var(--color-surface)] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              </ApiForm>
            )}
          </div>
        </div>
      )}
    </div></BusyScope>);
};
