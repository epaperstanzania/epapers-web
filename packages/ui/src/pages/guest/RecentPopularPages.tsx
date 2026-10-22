'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Paper } from '../../types';
import { PaperCard } from '../../components/common/PaperCard';
import { TrendingUp } from 'lucide-react';

export const PopularPage: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setPapers((await api.searchPapers({ sortBy: 'popular' })).papers);
      } catch {
        setError('Popular papers could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-cyan-tint)]  text-[var(--color-accent)] flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            Most Popular Papers
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-0.5">
            Ranked by downloads, then views and upload date when papers have similar activity.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text)]">{error}</p>
      ) : loading ? <PageLoader variant="cards" label="Loading content…" compact /> : papers.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">No approved papers are available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((p) => (
            <PaperCard key={p.id} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
};
