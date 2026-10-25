'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { Department, Program, Module, Paper } from '../../types';
import { PaperCard } from '../../components/common/PaperCard';
import { BookOpen, Layers, FileText, ArrowRight, Award } from 'lucide-react';

export const DepartmentDetailPage: React.FC = () => {
  const { dept: deptId } = useParams<{ dept: string }>();
  const [data, setData] = useState<{
    department: Department;
    programs: Program[];
    modules: Module[];
    papers: Paper[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');

  useEffect(() => {
    async function fetchDept() {
      if (!deptId) return;
      setLoading(true);
      try {
        setData(await api.getDepartment(deptId));
      } catch {
        setError('Department data could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchDept();
  }, [deptId]);

  if (loading) return <PageLoader variant="detail" label="Loading content…" />;

  if (error) {
    return <div role="alert" className="mx-auto max-w-xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text)]">{error}<button onClick={() => window.location.reload()} className="ml-2 font-semibold text-[var(--color-primary)] underline">Retry</button></div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-[var(--color-surface)]  rounded-xl border border-[var(--color-border)] ">
        <h2 className="font-heading font-bold text-lg text-[var(--color-text)] ">
          Department Not Found
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          The requested technical department could not be located in the DIT registry.
        </p>
        <Link
          to="/departments"
          className="mt-4 inline-block px-4 py-2 bg-[var(--color-primary)] text-[var(--color-surface)] rounded-lg text-xs font-semibold"
        >
          View All Departments
        </Link>
      </div>
    );
  }

  const { department, programs, modules, papers } = data;

  const filteredModules =
    selectedProgram === 'ALL'
      ? modules
      : modules.filter((m) => m.programId === selectedProgram);

  const filteredPapers =
    selectedProgram === 'ALL'
      ? papers
      : papers.filter((p) => p.programId === selectedProgram);

  return (
    <div className="space-y-8">
      {/* Department Hero Header */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-blue-tint)] text-[var(--color-primary)]  ">
              {department.code}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">DIT Academic Faculty</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[var(--color-text)] ">
            {department.name}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] ">
            {department.description}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[var(--color-canvas)]  p-4 rounded-xl border border-[var(--color-border)]  shrink-0">
          <div className="text-center">
            <span className="block font-heading font-extrabold text-lg text-[var(--color-primary)] ">
              {programs.length}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase font-medium">Programs</span>
          </div>
          <div className="w-px h-8 bg-[var(--color-input-border)] " />
          <div className="text-center">
            <span className="block font-heading font-extrabold text-lg text-[var(--color-primary)] ">
              {modules.length}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase font-medium">Modules</span>
          </div>
          <div className="w-px h-8 bg-[var(--color-input-border)] " />
          <div className="text-center">
            <span className="block font-heading font-extrabold text-lg text-[var(--color-primary)] ">
              {papers.length}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase font-medium">Papers</span>
          </div>
        </div>
      </div>

      {/* Program Selector Tabs */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-[var(--color-text)] ">
          Academic Degree & Diploma Programs
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedProgram('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedProgram === 'ALL'
                ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                : 'bg-[var(--color-surface)]  border border-[var(--color-border)]  text-[var(--color-text)] '
            }`}
          >
            All Programs ({modules.length})
          </button>
          {programs.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProgram(p.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedProgram === p.id
                  ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                  : 'bg-[var(--color-surface)]  border border-[var(--color-border)]  text-[var(--color-text)] '
              }`}
            >
              {p.code} — {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-[var(--color-text)] ">
          Accredited Course Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((mod) => (
            <Link
              key={mod.id}
              to={`/modules/${mod.id}`}
              className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-4 hover:border-[var(--color-accent)]/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-[var(--color-primary)] ">
                    {mod.code}
                  </span>
                  <span className="text-[11px] text-[var(--color-neutral)]">
                    Year {mod.levelYear || 1} ? Sem {((mod.levelYear || 1) - 1) * 2 + mod.semester} · {mod.credits} Credits
                  </span>
                </div>
                <h3 className="font-heading font-bold text-sm text-[var(--color-text)]  line-clamp-1">
                  {mod.name}
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate">
                  {mod.programName}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[var(--color-border)]  text-xs flex items-center justify-between text-[var(--color-text-muted)]">
                <span>{mod.papersCount} papers available</span>
                <span className="text-[var(--color-primary)]  font-semibold">View Papers →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Department Papers List */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-[var(--color-text)] ">
          Examination Papers in {department.name}
        </h2>
        {filteredPapers.length === 0 ? (
          <div className="p-8 bg-[var(--color-surface)]  rounded-xl border border-[var(--color-border)]  text-center text-xs text-[var(--color-text-muted)]">
            No papers currently archived for this program filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPapers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
