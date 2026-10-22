'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { Module, Paper, ExamCategory } from '../../types';
import { PaperCard } from '../../components/common/PaperCard';
import { PdfViewer } from '../../components/common/PdfViewer';
import { Upload, BookOpen, Layers, CheckCircle2, FileText, ArrowLeft, X } from 'lucide-react';

export const ModuleDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<{ module: Module; papers: Paper[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | 'ALL'>('ALL');
  const [previewPaper, setPreviewPaper] = useState<Paper | null>(null);

  useEffect(() => {
    async function fetchMod() {
      if (!code) return;
      setLoading(true);
      try {
        setData(await api.getModule(code));
      } catch {
        setError('Module data could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchMod();
  }, [code]);

  if (loading) return <PageLoader variant="detail" label="Loading content…" />;

  if (error) {
    return <div role="alert" className="mx-auto max-w-xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text)]">{error}<button onClick={() => window.location.reload()} className="ml-2 font-semibold text-[var(--color-primary)] underline">Retry</button></div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-[var(--color-surface)]  rounded-xl border border-[var(--color-border)] ">
        <h2 className="font-heading font-bold text-lg text-[var(--color-text)] ">
          Module &quot;{code}&quot; Not Found
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          This course code is not in the DIT curriculum archive yet.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            to="/search"
            className="px-4 py-2 bg-[var(--color-sidebar)]  text-xs font-semibold rounded-lg"
          >
            Search Again
          </Link>
          <Link
            to="/request-module"
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-semibold rounded-lg"
          >
            Request Module
          </Link>
        </div>
      </div>
    );
  }

  const { module, papers } = data;

  const filteredPapers =
    selectedCategory === 'ALL'
      ? papers
      : papers.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Module Overview Header */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-extrabold px-2.5 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-surface)]">
              {module.code}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Semester {module.semester} · {module.credits} Credits · Year {module.levelYear}
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[var(--color-text)] ">
            {module.name}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] ">
            {module.programName} · {module.departmentName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            to={`/upload?moduleCode=${encodeURIComponent(module.code)}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-primary-dark)] transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Upload for {module.code}</span>
          </Link>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-sidebar)]  rounded-lg text-xs font-semibold">
          {(['ALL', 'TEST', 'UE', 'SUPP'] as const).map((cat) => {
            const count =
              cat === 'ALL'
                ? papers.length
                : papers.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[var(--color-surface)]  text-[var(--color-primary)]  shadow-xs font-bold'
                    : 'text-[var(--color-text-muted)]  hover:text-[var(--color-text)]'
                }`}
              >
                {cat === 'ALL' ? 'All Assessments' : cat} ({count})
              </button>
            );
          })}
        </div>

        <span className="text-xs text-[var(--color-text-muted)]">
          Showing <strong>{filteredPapers.length}</strong> archived examination sets
        </span>
      </div>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="p-10 bg-[var(--color-surface)]  rounded-xl border border-[var(--color-border)]  text-center space-y-3">
          <FileText className="w-8 h-8 text-[var(--color-neutral)] mx-auto" />
          <h3 className="font-heading font-bold text-sm text-[var(--color-text)] ">
            No papers found for {selectedCategory}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
            No approved papers are available for this category yet.
          </p>
          <Link
            to={`/upload?moduleCode=${encodeURIComponent(module.code)}`}
            className="inline-block mt-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-surface)] rounded-lg text-xs font-semibold"
          >
            Upload {selectedCategory} Paper
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onPreview={(p) => setPreviewPaper(p)}
            />
          ))}
        </div>
      )}

      {/* Quick Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--color-text)]/20 animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-[var(--color-surface)]  rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[92vh]">
            <div className="px-5 py-3 border-b border-[var(--color-border)]  flex items-center justify-between bg-[var(--color-input)] ">
              <div>
                <h3 className="font-heading font-bold text-sm text-[var(--color-text)] ">
                  {previewPaper.moduleCode} — {previewPaper.title}
                </h3>
                <span className="text-xs text-[var(--color-neutral)]">
                  {previewPaper.academicYear} · {previewPaper.departmentName}
                </span>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="p-1.5 rounded-lg text-[var(--color-neutral)] hover:text-[var(--color-text-muted)]  cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <PdfViewer paper={previewPaper} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
