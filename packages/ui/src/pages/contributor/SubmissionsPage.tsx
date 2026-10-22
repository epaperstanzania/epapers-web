'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { Link } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Paper, PaperStatus } from '../../types';
import { StatusChip, CategoryChip } from '../../components/common/Chips';
import {
  Upload,
  Eye,
  RotateCcw,
} from 'lucide-react';

export const SubmissionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | PaperStatus>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = apiTask(async () => {
      setLoading(true);
      const all = await api.getAllPapers(true);
      const username = currentUser?.username || '';
      const mine = all.filter((p) => p.uploadedBy.username === username);
      setPapers(mine);
      setLoading(false);
    }, () => setLoading(false));
    loadSubmissions();
  }, [currentUser]);

  const filtered = papers.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.status === activeTab;
  });

  const pendingCount = papers.filter((p) => p.status === 'PENDING').length;
  const approvedCount = papers.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = papers.filter((p) => p.status === 'REJECTED').length;

  if (loading) return <PageLoader variant="rows" label="Loading content…" />;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            My Examination Submissions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Track verification status, moderation feedback, and review outcomes across your archival contributions.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-primary-dark)] transition-colors shrink-0 shadow-xs"
        >
          <Upload className="w-4 h-4 text-[var(--color-accent)]" />
          <span>New Upload</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)]  pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
              : 'text-[var(--color-text-muted)]  hover:bg-[var(--color-sidebar)] '
          }`}
        >
          All ({papers.length})
        </button>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-[var(--color-warning)] text-[var(--color-primary-dark)] font-bold shadow-xs'
              : 'text-[var(--color-text-muted)]  hover:bg-[var(--color-sidebar)] '
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'bg-[var(--color-success)] text-[var(--color-surface)] shadow-xs'
              : 'text-[var(--color-text-muted)]  hover:bg-[var(--color-sidebar)] '
          }`}
        >
          Approved ({approvedCount})
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'REJECTED'
              ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
              : 'text-[var(--color-text-muted)]  hover:bg-[var(--color-sidebar)] '
          }`}
        >
          Requires Revision ({rejectedCount})
        </button>
      </div>

      {/* Submissions List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-[var(--color-surface)]  rounded-xl border border-[var(--color-border)]  space-y-3">
          <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
            No submissions in this status
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
            Upload past examination papers to contribute to the campus repository.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((paper) => (
            <div
              key={paper.id}
              className={`p-4 sm:p-5 rounded-xl border bg-[var(--color-surface)]  transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                paper.status === 'REJECTED'
                  ? 'border-[var(--color-danger-soft-hover)] '
                  : paper.status === 'PENDING'
                  ? 'border-[var(--color-warning)]/40 '
                  : 'border-[var(--color-border)] '
              }`}
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryChip category={paper.category} size="sm" />
                  <span className="font-mono text-xs font-bold text-[var(--color-text)] ">
                    {paper.moduleCode}
                  </span>
                  <span className="text-xs text-[var(--color-neutral)]">·</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {paper.academicYear} · Sem {paper.semester}
                  </span>
                  <StatusChip status={paper.status} />
                </div>

                <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
                  {paper.title}
                </h3>

                <p className="text-xs text-[var(--color-text-muted)] ">
                  {paper.moduleName} · {paper.departmentName}
                </p>

                {/* Moderation Note if Rejected */}
                {paper.rejectionReason && (
                  <div className="mt-2 p-3 rounded-xl bg-[var(--color-danger-soft)]  border border-[var(--color-danger-soft-hover)]  text-xs text-[var(--color-danger)] ">
                    <strong>Review Directorate Notice:</strong> {paper.rejectionReason}
                  </div>
                )}
              </div>

              {/* Actions & Status details */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
                <div className="text-xs text-[var(--color-neutral)]">
                  Uploaded {new Date(paper.uploadedAt).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2">
                  {paper.status === 'APPROVED' && (
                    <Link
                      to={`/papers/${paper.id}`}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)]  text-xs font-semibold text-[var(--color-primary)]  hover:bg-[var(--color-input)]  flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Live</span>
                    </Link>
                  )}

                  {paper.status === 'REJECTED' && (
                    <Link
                      to={`/upload?moduleCode=${encodeURIComponent(paper.moduleCode)}`}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-danger-soft-hover)] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-upload Clean Scan</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
