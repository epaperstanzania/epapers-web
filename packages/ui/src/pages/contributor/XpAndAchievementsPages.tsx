'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AchievementBadge } from '../../types';
import { LevelBadge } from '../../components/common/LevelBadge';
import { Check } from 'lucide-react';

export const AchievementsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = apiTask(async () => {
      setLoading(true);
      const res = await api.getAchievements();
      setAchievements(res);
      setLoading(false);
    }, () => setLoading(false));
    load();
  }, []);

  const userLevel = currentUser?.level || 1;

  const tiers = [
    { level: 1, title: 'Novice Archivist', description: 'Foundational campus contributor' },
    { level: 2, title: 'Scholar', description: 'Active contributor with verified submissions' },
    { level: 3, title: 'Senior Curator', description: 'Advanced contributor with marking keys' },
    { level: 4, title: 'Master Archivist', description: 'Distinguished repository curator' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8">
        <h1 className="font-bold text-xl sm:text-2xl text-[var(--color-text)] ">
          Achievements & Standing
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Earn to top tiers to secure your milestones🎁.
        </p>
      </div>

      {/* Level Roadmap (4 titles, current highlighted, NO numbers) */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-bold text-sm text-[var(--color-text)] ">
            Curator Level Roadmap
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Archivist standing progression based on accepted examination papers and solution keys.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {tiers.map((t) => {
            const isCurrent = t.level === userLevel;
            const isUnlocked = t.level <= userLevel;

            return (
              <div
                key={t.level}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[var(--color-primary)] bg-[var(--color-blue-tint)]  ring-1 ring-[var(--color-primary)]'
                    : isUnlocked
                    ? 'border-[var(--color-border)]  bg-[var(--color-canvas)] '
                    : 'border-[var(--color-border)]  bg-[var(--color-input)]/50  text-[var(--color-neutral)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[var(--color-neutral)]">
                      {t.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-surface)]">
                        Current
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[var(--color-text)] ">
                    {t.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]  mt-1 leading-snug">
                    {t.description}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-[var(--color-border)]/60  text-[11px]">
                  {isCurrent ? (
                    <span className="font-bold text-[var(--color-primary)] ">Active Standing</span>
                  ) : isUnlocked ? (
                    <span className="text-[var(--color-success)] font-semibold">Completed</span>
                  ) : (
                    <span className="text-[var(--color-neutral)]">Upcoming Tier</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge Gallery - Flat tiles, NO XP numbers */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-bold text-sm text-[var(--color-text)] ">
            Badges Gallery
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Archival milestones awarded upon moderation verification.
          </p>
        </div>

        {loading ? <PageLoader variant="cards" label="Loading content…" compact /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                  ach.isUnlocked
                    ? 'bg-[var(--color-surface)]  border-[var(--color-border)] '
                    : 'bg-[var(--color-canvas)]  border-[var(--color-border)]  text-[var(--color-neutral)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[var(--color-text)] ">
                      {ach.title}
                    </span>
                    {ach.isUnlocked ? (
                      <span className="text-[11px] font-semibold text-[var(--color-success)]">
                        Earned
                      </span>
                    ) : ach.progress > 0 ? (
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                        In Progress
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--color-neutral)]">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]  leading-snug">
                    {ach.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[var(--color-border)]  text-[11px] text-[var(--color-neutral)]">
                  {ach.isUnlocked ? `Validated ${ach.unlockedDate || '2023'}` : 'Requires verification'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
