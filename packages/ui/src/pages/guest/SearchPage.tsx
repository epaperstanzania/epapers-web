'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { Department, Program, Paper, ExamCategory, PaperFilters } from '../../types';
import { PaperCard } from '../../components/common/PaperCard';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  FileText,
  RotateCcw,
  CheckCircle,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category');
  const initialCat: ExamCategory | 'ALL' = categoryParam === 'TEST' || categoryParam === 'UE' || categoryParam === 'SUPP' ? categoryParam : 'ALL';

  const [query, setQuery] = useState(initialQuery);
  const [departmentId, setDepartmentId] = useState<string>('ALL');
  const [programId, setProgramId] = useState<string>('ALL');
  const [category, setCategory] = useState<ExamCategory | 'ALL'>(initialCat);
  const [academicYear, setAcademicYear] = useState<string>('ALL');
  const [semester, setSemester] = useState<number | 'ALL'>('ALL');
  const [hasMarkingScheme, setHasMarkingScheme] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'year_desc' | 'year_asc'>('recent');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Load departments and programs once
  useEffect(() => {
    async function loadMeta() {
      try {
        const [d, p] = await Promise.all([api.getDepartments(), api.getPrograms()]);
        setDepartments(d);
        setPrograms(p);
      } catch {
        setError('Search filters could not be loaded. Please try again.');
      }
    }
    loadMeta();
  }, []);

  // Filter programs when department changes
  const availablePrograms = useMemo(() => {
    if (departmentId === 'ALL') return programs;
    return programs.filter((p) => p.departmentId === departmentId);
  }, [programs, departmentId]);

  // Execute paper search
  useEffect(() => {
    let active = true;
    async function runSearch() {
      setLoading(true);
      try {
        setError(null);
        const res = await api.searchPapers({
          query,
          departmentId: departmentId === 'ALL' ? undefined : departmentId,
          programId: programId === 'ALL' ? undefined : programId,
          category: category === 'ALL' ? undefined : category,
          year: academicYear === 'ALL' ? undefined : academicYear,
          semester: semester === 'ALL' ? undefined : semester,
          hasMarkingScheme: hasMarkingScheme ? true : undefined,
          sortBy,
        });
        if (active) setPapers(res.papers);
      } catch {
        if (active) {
          setPapers([]);
          setError('Search is temporarily unavailable. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    const timer = setTimeout(runSearch, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, departmentId, programId, category, academicYear, semester, hasMarkingScheme, sortBy, retryCount]);

  const resetFilters = () => {
    setQuery('');
    setDepartmentId('ALL');
    setProgramId('ALL');
    setCategory('ALL');
    setAcademicYear('ALL');
    setSemester('ALL');
    setHasMarkingScheme(false);
    setSortBy('recent');
    setSearchParams({});
  };

  const hasActiveFilters =
    query !== '' ||
    departmentId !== 'ALL' ||
    programId !== 'ALL' ||
    category !== 'ALL' ||
    academicYear !== 'ALL' ||
    semester !== 'ALL' ||
    hasMarkingScheme;

  return (
    <div className="space-y-6">
      {/* Header & Main Search Input */}
      <div className="bg-[var(--color-surface)]  p-5 sm:p-6 rounded-xl border border-[var(--color-border)]  shadow-xs space-y-4">
        <div>
          <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-text)] ">
            Search
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-0.5">
            search matching module codes (e.g. &apos;COE07201&apos; or &apos;COE 07201&apos;), course names, and keywords.
          </p>
        </div>

        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-[var(--color-neutral)] absolute left-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type module code, title, or topic..."
            className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--color-text)]  placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 p-1 text-[var(--color-neutral)] hover:text-[var(--color-text-muted)]  cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick category toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--color-sidebar)]  rounded-lg text-xs font-semibold">
            {(['ALL', 'TEST', 'UE', 'SUPP'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-[var(--color-surface)]  text-[var(--color-primary)]  shadow-xs font-bold'
                    : 'text-[var(--color-text-muted)]  hover:text-[var(--color-text)]'
                }`}
              >
                {cat === 'ALL' ? 'All Types' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)]  text-xs font-semibold text-[var(--color-text)]  cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as NonNullable<PaperFilters['sortBy']>)}
              className="bg-[var(--color-sidebar)]  border border-[var(--color-border)]  rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)]  focus:outline-hidden"
            >
              <option value="recent">Sort: Most Recent</option>
              <option value="popular">Sort: Most Downloaded</option>
              <option value="year_desc">Academic Year (Newest)</option>
              <option value="year_asc">Academic Year (Oldest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters (desktop) + Search Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Filter Panel */}
        <div className="hidden lg:block bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-5 space-y-5 sticky top-20 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] ">
            <div className="flex items-center gap-2 font-heading font-bold text-sm text-[var(--color-text)] ">
              <Filter className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-[var(--color-primary)]  hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)] ">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setProgramId('ALL');
              }}
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2 text-xs text-[var(--color-text)]  focus:outline-hidden"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Program Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)] ">
              Degree / Diploma Program
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2 text-xs text-[var(--color-text)]  focus:outline-hidden"
            >
              <option value="ALL">All Programs</option>
              {availablePrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)] ">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2 text-xs text-[var(--color-text)]  focus:outline-hidden"
            >
              <option value="ALL">All Academic Years</option>
              {['2024/2025', '2023/2024', '2022/2023', '2021/2022', '2020/2021', '2019/2020'].map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Semester Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)] ">
              Semester
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'All', val: 'ALL' },
                { label: 'Sem 1', val: 1 },
                { label: 'Sem 2', val: 2 },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSemester(s.val as number | 'ALL')}
                  className={`py-1.5 rounded text-xs font-semibold border cursor-pointer transition-colors ${
                    semester === s.val
                      ? 'bg-[var(--color-blue-tint)] text-[var(--color-primary)] border-[var(--color-primary)]  '
                      : 'border-[var(--color-border)]  text-[var(--color-text-muted)] '
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Has Marking Scheme toggle */}
          <div className="pt-2 border-t border-[var(--color-border)] ">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasMarkingScheme}
                onChange={(e) => setHasMarkingScheme(e.target.checked)}
                className="w-4 h-4 text-[var(--color-primary)] rounded border-[var(--color-input-border)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-xs font-semibold text-[var(--color-text)] ">
                Has marking scheme
              </span>
            </label>
          </div>
        </div>

        {/* Mobile filter sheet */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Search filters">
            <button aria-label="Close filters" onClick={() => setMobileFilterOpen(false)} className="absolute inset-0 bg-[var(--color-text)]/20" />
            <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 pb-8 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-base text-[var(--color-text)]">Filters</h2>
                <button aria-label="Close filters" onClick={() => setMobileFilterOpen(false)} className="min-h-11 min-w-11 rounded-lg text-[var(--color-text-muted)]"><X aria-hidden="true" /></button>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-1 text-sm font-semibold text-[var(--color-text)]">Department
                  <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setProgramId('ALL'); }} className="min-h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 font-normal">
                    <option value="ALL">All departments</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[var(--color-text)]">Program
                  <select value={programId} onChange={(event) => setProgramId(event.target.value)} className="min-h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 font-normal">
                    <option value="ALL">All programs</option>{availablePrograms.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[var(--color-text)]">Category
                  <select value={category} onChange={(event) => setCategory(event.target.value as ExamCategory | 'ALL')} className="min-h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 font-normal">
                    <option value="ALL">All categories</option><option value="TEST">TEST</option><option value="UE">UE</option><option value="SUPP">SUPP</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[var(--color-text)]">Academic year
                  <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="min-h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 font-normal">
                    <option value="ALL">All years</option>{['2024/2025', '2023/2024', '2022/2023', '2021/2022', '2020/2021', '2019/2020'].map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-[var(--color-text)]">Semester
                  <select value={semester} onChange={(event) => setSemester(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))} className="min-h-11 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 font-normal">
                    <option value="ALL">All semesters</option><option value="1">Semester 1</option><option value="2">Semester 2</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
                  <input type="checkbox" checked={hasMarkingScheme} onChange={(event) => setHasMarkingScheme(event.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />
                  Has marking scheme
                </label>
                <div className="flex gap-3">
                  <button onClick={resetFilters} className="min-h-11 flex-1 rounded-lg border border-[var(--color-input-border)] font-semibold text-[var(--color-text)]">Reset</button>
                  <button onClick={() => setMobileFilterOpen(false)} className="min-h-11 flex-1 rounded-lg bg-[var(--color-primary)] font-semibold text-[var(--color-surface)]">Show results</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Stream */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] ">
            <span>
              Showing <strong>{papers.length}</strong> archived papers
            </span>
            {hasActiveFilters && (
              <span className="text-[var(--color-accent)] font-medium">Filtered results</span>
            )}
          </div>

          {error ? (
            <div role="alert" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text)]">{error}<button onClick={() => setRetryCount((count) => count + 1)} className="ml-2 font-semibold text-[var(--color-primary)] underline">Retry</button></div>
          ) : loading ? <PageLoader variant="cards" label="Loading search results…" compact /> : papers.length === 0 ? (
            <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-sidebar)]  text-[var(--color-neutral)] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
                No past examination papers match your filters
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
                Try broadening your criteria, clearing the search query, or request this module to be added to the Epapers library
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg bg-[var(--color-sidebar)]  text-xs font-semibold text-[var(--color-text)]  hover:bg-[var(--color-border)] cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
