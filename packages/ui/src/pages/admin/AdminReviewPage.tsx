'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Paper, Department } from '../../types';
import { PdfViewer } from '../../components/common/PdfViewer';
import { UsernameTile } from '../../components/common/UsernameTile';
import { CategoryChip } from '../../components/common/Chips';
import {
  SkipForward,
  Edit2,
  AlertTriangle,
  Layers,
  Filter,
} from 'lucide-react';

export const AdminReviewPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [allPendingPapers, setAllPendingPapers] = useState<Paper[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [groupByDept, setGroupByDept] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Page illegible / blurry text');
  const [isSpam, setIsSpam] = useState(false);

  // Edit fields
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCode, setEditedCode] = useState('');
  const [editedYear, setEditedYear] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    setLoadError(null);
    try {
    const [all, depts] = await Promise.all([api.getAllPapers(true), api.getDepartments()]);
    const pending = all.filter((p) => p.status === 'PENDING');
    setAllPendingPapers(pending);
    setDepartments(depts);
    setCurrentIndex(0);
    } catch {
      setLoadError('The moderation queue could not be loaded. Retry to continue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Filtered pending papers based on selected department
  const filteredPapers = allPendingPapers.filter((p) => {
    if (selectedDeptFilter === 'ALL') return true;
    return p.departmentId === selectedDeptFilter;
  });

  const currentPaper = filteredPapers[currentIndex] || null;

  useEffect(() => {
    if (currentPaper) {
      setEditedTitle(currentPaper.title);
      setEditedCode(currentPaper.moduleCode);
      setEditedYear(currentPaper.academicYear);
    }
  }, [currentPaper]);

  const handleApprove = run(async () => {
    if (!currentPaper) return;
    const res = await api.reviewPaper(currentPaper.id, 'approve');
    setActionFeedback(res.message);
    setTimeout(() => {
      setActionFeedback(null);
      loadQueue();
    }, 1200);
  }, () => setLoading(false));

  const handleApproveWithEdits = run(async () => {
    if (!currentPaper) return;
    const selectedModule = await api.getModule(editedCode);
    if (!selectedModule) { setActionFeedback('Choose an existing module code.'); return; }
    const res = await api.reviewPaper(
      currentPaper.id,
      'approve_with_edits',
      'Corrected metadata by reviewer',
      {
        title: editedTitle,
        moduleId: selectedModule.module.id,
      }
    );
    setIsEditingMetadata(false);
    setActionFeedback(res.message);
    setTimeout(() => {
      setActionFeedback(null);
      loadQueue();
    }, 1200);
  }, () => setLoading(false));

  const handleRejectOrSpam = run(async () => {
    if (!currentPaper) return;
    const action = isSpam ? 'spam' : 'reject';
    const res = await api.reviewPaper(currentPaper.id, action, rejectReason);
    setRejectModalOpen(false);
    setActionFeedback(res.message);
    setTimeout(() => {
      setActionFeedback(null);
      loadQueue();
    }, 1200);
  }, () => setLoading(false));

  // Group papers by department
  const groupedByDepartment = departments.map((dept) => {
    const papersInDept = allPendingPapers.filter((p) => p.departmentId === dept.id);
    return {
      department: dept,
      papers: papersInDept,
    };
  }).filter((g) => g.papers.length > 0);

  if (loading) return <PageLoader variant="detail" label="Loading content…" />;

  return (<BusyScope busy={busy}><div className="space-y-4">
      {loadError && <div role="alert" className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{loadError} <button className="ml-2 underline" onClick={loadQueue}>Retry</button></div>}
      {/* Top Filter & Routing Controls Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-[var(--color-text)]">Department:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => {
                setSelectedDeptFilter(e.target.value);
                setCurrentIndex(0);
              }}
              className="bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] font-medium focus:outline-hidden focus:border-[var(--color-primary)]"
            >
              <option value="ALL">All Departments ({allPendingPapers.length})</option>
              {departments.map((d) => {
                const count = allPendingPapers.filter((p) => p.departmentId === d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    {d.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Group By Department Toggle */}
          <button
            onClick={() => setGroupByDept(!groupByDept)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              groupByDept
                ? 'bg-[var(--color-active)] border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'bg-[var(--color-input)] border-[var(--color-input-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Group by Department</span>
          </button>
        </div>

        {actionFeedback && (
          <div className="text-xs font-semibold text-[var(--color-success)] bg-[var(--color-success-soft)] px-3 py-1 rounded-lg border border-[var(--color-success)]/20">
            {actionFeedback}
          </div>
        )}

        {filteredPapers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">
              Item {currentIndex + 1} of {filteredPapers.length}
            </span>
            <button
              onClick={() => setCurrentIndex((idx) => (idx + 1) % filteredPapers.length)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-input-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-input)] cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Next</span>
            </button>
          </div>
        )}
      </div>

      {/* If Group By Department view is active, show department drawer / header list */}
      {groupByDept && groupedByDepartment.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
            Queue Grouped by Department
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {groupedByDepartment.map((group) => (
              <div
                key={group.department.id}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                  selectedDeptFilter === group.department.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-active)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] hover:bg-[var(--color-sidebar)]'
                }`}
                onClick={() => {
                  setSelectedDeptFilter(group.department.id);
                  setCurrentIndex(0);
                }}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="truncate">{group.department.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-[var(--color-primary)] text-[var(--color-input)] font-mono text-[10px]">
                    {group.papers.length}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate">
                  {group.papers.map((p) => p.moduleCode).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Review Section or Empty State */}
      {!currentPaper ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
          <h2 className="font-bold text-lg text-[var(--color-text)]">
            Moderation Queue Empty
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {selectedDeptFilter === 'ALL'
              ? 'All submitted examination papers have been reviewed.'
              : 'No pending papers found for the selected department.'}
          </p>
          {selectedDeptFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedDeptFilter('ALL')}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold rounded-lg hover:bg-[var(--color-primary-dark)]"
            >
              Show All Departments
            </button>
          )}
        </div>
      ) : (
        /* 2-Column Split View: PDF Left, Metadata & Actions Right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: PDF Viewer (Span 7) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text)]">
                {currentPaper.departmentName} · {currentPaper.moduleCode}
              </span>
              <span>{currentPaper.fileSize} · {currentPaper.pageCount} Pages</span>
            </div>
            <PdfViewer paper={currentPaper} />
          </div>

          {/* RIGHT: Metadata & Moderation Actions (Span 5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Uploader Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                Uploader Details
              </span>
              <div className="flex items-center justify-between">
                <UsernameTile
                  username={currentPaper.uploadedBy.username}
                  size="md"
                  avatarId={currentPaper.uploadedBy.avatarId}
                  showDetails={true}
                  role={currentPaper.uploadedBy.role}
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(currentPaper.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {currentPaper.duplicateWarning && (
                <div className="p-3 bg-[var(--color-warning-soft)] border border-[var(--color-warning)]/40 rounded-lg text-xs text-[var(--color-warning-text)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-warning-text)] shrink-0" />
                  <span>Potential duplicate scan detected in department archives.</span>
                </div>
              )}
            </div>

            {/* Archival Metadata Editor */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Archival Metadata
                </span>
                <button
                  onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingMetadata ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>

              {isEditingMetadata ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">
                      Module Code
                    </label>
                    <input
                      type="text"
                      value={editedCode}
                      onChange={(e) => setEditedCode(e.target.value)}
                      className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2 text-xs text-[var(--color-text)] font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">
                      Paper Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2 text-xs text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-muted)] block mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={editedYear}
                      disabled
                      className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2 text-xs text-[var(--color-text)]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-muted)]">Department:</span>
                    <strong className="text-[var(--color-text)]">{currentPaper.departmentName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-muted)]">Module:</span>
                    <strong className="text-[var(--color-text)] font-mono">
                      {currentPaper.moduleCode} ({currentPaper.moduleName})
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-muted)]">Category:</span>
                    <CategoryChip category={currentPaper.category} testNumber={currentPaper.testNumber} size="sm" />
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-muted)]">Academic Session:</span>
                    <strong className="text-[var(--color-text)]">
                      {currentPaper.academicYear} · Semester {currentPaper.semester}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--color-text-muted)]">Marking Scheme:</span>
                    <span className={currentPaper.hasMarkingScheme ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-text-muted)]'}>
                      {currentPaper.hasMarkingScheme ? 'Attached' : 'None Attached'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Moderation Directorate Actions */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                Moderation Decision
              </span>

              {isEditingMetadata ? (
                <button
                  onClick={handleApproveWithEdits}
                  className="w-full py-2.5 bg-[var(--color-primary)] text-[var(--color-input)] font-semibold rounded-lg text-xs hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
                >
                  Approve with Corrected Metadata
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  className="w-full py-2.5 bg-[var(--color-success)] hover:bg-[var(--color-success)] text-[var(--color-input)] font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Approve Paper
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsSpam(false);
                    setRejectModalOpen(true);
                  }}
                  className="py-2 px-3 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] text-[var(--color-danger)] font-semibold text-xs hover:bg-[var(--color-danger-soft-hover)] transition-colors cursor-pointer"
                >
                  Reject Submission
                </button>

                <button
                  onClick={() => {
                    setIsSpam(true);
                    setRejectModalOpen(true);
                  }}
                  className="py-2 px-3 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] text-[var(--color-text-muted)] font-semibold text-xs hover:bg-[var(--color-sidebar)] transition-colors cursor-pointer"
                >
                  Mark as Spam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Spam Reason Modal - NO PENALTY TEXT */}
      {rejectModalOpen && currentPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-text)]/40">
          <div role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full space-y-4 shadow-sm">
            <div>
              <h3 id="reject-dialog-title" className="font-bold text-base text-[var(--color-text)]">
                {isSpam ? 'Mark as Spam' : 'Reject Examination Submission'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                State the reason for records. The contributor will receive this reason.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                Moderation Reason (Required)
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (e.g. Page 3 missing, illegible scan)..."
                className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectOrSpam}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--color-danger)] text-[var(--color-input)] font-semibold text-xs hover:bg-[var(--color-danger)] cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div></BusyScope>);
};
