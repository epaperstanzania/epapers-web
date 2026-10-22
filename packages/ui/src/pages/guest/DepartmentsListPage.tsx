'use client';
import { PageLoader } from '../../components/common/PageLoader';
import React, { useState, useEffect } from 'react';
import { Link } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { Department } from '../../types';
import { BookOpen, ArrowRight, Laptop, Cpu, Building2, Wrench, Briefcase, FlaskConical } from 'lucide-react';

export const DepartmentsListPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDepts() {
      setLoading(true);
      try {
        setDepartments(await api.getDepartments());
      } catch {
        setError('Departments could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadDepts();
  }, []);

  const getDeptIcon = (code: string) => {
    switch (code) {
      case 'CS': return Laptop;
      case 'ETE': return Cpu;
      case 'CE': return Building2;
      case 'ME': return Wrench;
      case 'BA': return Briefcase;
      case 'SLT':
      default: return FlaskConical;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs">
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[var(--color-text)] ">
          Academic Departments
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-1 max-w-2xl">
          EPapers organizes historical assessments across DIT faculties. Select a department to explore degree and diploma syllabi, course modules, and past papers.
        </p>
      </div>

      {loading ? <PageLoader variant="cards" label="Loading content…" compact /> : error ? (
        <div role="alert" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text)]">{error}</div>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">No departments are available yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const Icon = getDeptIcon(dept.code);
            return (
              <Link
                key={dept.id}
                to={`/departments/${dept.id}`}
                className="group bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 hover:border-[var(--color-accent)]/50 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-blue-tint)]  text-[var(--color-primary)]  flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-sidebar)]  text-[var(--color-text)] ">
                      {dept.code}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-[var(--color-text)]  group-hover:text-[var(--color-primary)]  transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]  mt-1.5 leading-relaxed">
                    {dept.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border)]  flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <span>{dept.programsCount} Programs</span>
                    <span>·</span>
                    <span>{dept.modulesCount} Modules</span>
                  </div>
                  <span className="font-bold text-[var(--color-primary)]  flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Browse</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
