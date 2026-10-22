'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Paper } from '../../types';
import { PaperCard } from '../../components/common/PaperCard';
import { Link } from '@epapers/ui/navigation';
import { GraduationCap, FolderSync, ArrowRight } from 'lucide-react';

export const LecturerPapersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = apiTask(async () => {
      setLoading(true);
      const all = await api.getAllPapers(false);
      const faculty = all.filter((p) => p.verifiedLecturerBadge);
      setPapers(faculty);
      setLoading(false);
    }, () => setLoading(false));
    load();
  }, []);

  if (loading) return <PageLoader variant="rows" label="Loading content…" />;
  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[var(--color-primary)] " />
            <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
              Faculty Endorsed Exam Papers
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Curated papers published directly by verified DIT departmental lecturers and course instructors.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold shrink-0">
          Verified Faculty  
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {papers.map((p) => (
          <PaperCard key={p.id} paper={p} />
        ))}
      </div>
    </div>
  );
};

export const BulkUploadPage: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-6">
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-4">
      <div className="flex items-center gap-2 text-[var(--color-primary)]">
        <FolderSync className="w-6 h-6" />
        <h1 className="font-bold text-xl sm:text-2xl text-[var(--color-text)]">Lecturer paper upload</h1>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        Add each paper with its department, program, module, assessment details, and PDF files.  Lecturers receive automatic publication only for papers in their own department.
      </p>
      <Link to="/upload" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-surface)] hover:bg-[var(--color-primary-dark)]">
        Start a paper upload <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  </div>
);
