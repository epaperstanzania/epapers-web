'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { Department, Paper } from '../../types';
import { PaperCard } from '../../components/common/PaperCard';
import {
  Search,
  ArrowRight,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [popularPapers, setPopularPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [depts, popRes] = await Promise.all([
          api.getDepartments(),
          api.searchPapers({ sortBy: 'popular' }),
        ]);
        setDepartments(depts);
        setPopularPapers(popRes.papers.slice(0, 6));
      } catch {
        setError('The repository could not be loaded. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Home Hero: Plain background, heading, search bar and filter chips, no illustrations or 3D art */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-10 space-y-5">
        <div className="max-w-3xl space-y-3">


          <h1 className="font-bold text-2xl sm:text-4xl text-[var(--color-text)] leading-tight">
            Past Examination Papers & Marking Schemes collected
          </h1>

          <p className="text-[var(--color-text-muted)] text-xs sm:text-sm leading-relaxed max-w-2xl">
            Search DIT examination papers by module code, module name, or department. Preview and download your favorite examination.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-2xl space-y-3">
          <div className="flex items-center bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-1.5 focus-within:border-[var(--color-primary)]">
            <Search className="w-5 h-5 text-[var(--color-neutral)] ml-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module code (e.g. COE 07201, CS 174), module name, or department..."
              className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[var(--color-text)] placeholder-[var(--color-neutral)] focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-input)] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              Search
            </button>
          </div>

          {/* Filter Chips on Plain Background */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[var(--color-text-muted)] font-medium">Quick filters:</span>
            {[
              { label: 'COE 07201', query: '/search?q=COE+07201' },
              { label: 'CS 174', query: '/search?q=CS+174' },
              { label: 'EE 05102', query: '/search?q=EE+05102' },
              { label: 'University Exams (UE)', query: '/search?category=UE' },
              { label: 'Continuous Tests', query: '/search?category=TEST' },
              { label: 'Supplementary', query: '/search?category=SUPP' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => navigate(chip.query)}
                className="px-2.5 py-1 rounded-lg bg-[var(--color-sidebar)] hover:bg-[var(--color-active)] text-[var(--color-primary)] text-[11px] font-medium transition-colors cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      {error && <div role="alert" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]">{error}<button onClick={() => window.location.reload()} className="ml-2 font-semibold text-[var(--color-primary)] underline">Retry</button></div>}

      {/* Departments Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-[var(--color-text)]">
              Academic Departments
            </h2>
          </div>
          <Link
            to="/departments"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? <PageLoader variant="cards" label="Loading content…" compact /> : departments.length === 0 ? (
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">No departments are available yet.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Link
              key={dept.id}
              to={`/departments/${dept.id}`}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 hover:border-[var(--color-primary)] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-sidebar)] px-2 py-0.5 rounded">
                    {dept.code}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {dept.papersCount} papers
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-text)]">
                  {dept.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-1">
                  {dept.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                <span>{dept.programsCount} Programs · {dept.modulesCount} Modules</span>
                <span className="text-[var(--color-primary)] font-semibold">
                  Browse →
                </span>
              </div>
            </Link>
          ))}
        </div>
        )}
      </section>

      {/* Popular Papers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-[var(--color-text)]">
              Frequently Downloaded Examination Papers
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Ranked by downloads and views
            </p>
          </div>
          <Link
            to="/popular"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? <PageLoader variant="cards" label="Loading papers…" compact showLogo={false} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularPapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
