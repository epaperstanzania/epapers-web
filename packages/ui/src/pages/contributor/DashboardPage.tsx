'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { Link } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AchievementBadge, PaperSuggestion, UserProfile } from '../../types';
import { UsernameTile } from '../../components/common/UsernameTile';
import { LevelBadge } from '../../components/common/LevelBadge';
import { ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<PaperSuggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'progress' | 'locked'>('all');
  const [loading, setLoading] = useState(true);

  const user = currentUser;

  useEffect(() => {
    const loadData = apiTask(async () => {
      setLoading(true);
      setSuggestionsError(false);
      const [achs, leads, requested] = await Promise.all([
        api.getAchievements(),
        api.getLeaderboard(),
        api.getPaperSuggestions().catch(() => { setSuggestionsError(true); return []; }),
      ]);
      setAchievements(achs);
      setLeaderboard(leads);
      setSuggestions(requested);
      setLoading(false);
    }, () => setLoading(false));
    loadData();
  }, [user?.id]);

  if (!user) return null;

  const filteredAchievements = achievements.filter((ach) => {
    if (achievementFilter === 'unlocked') return ach.isUnlocked;
    if (achievementFilter === 'progress') return !ach.isUnlocked && ach.progress > 0;
    if (achievementFilter === 'locked') return !ach.isUnlocked && ach.progress === 0;
    return true;
  });

  if (loading) return <PageLoader variant="dashboard" label="Loading content…" />;
  return (
    <div className="min-w-0 space-y-5 sm:space-y-7">
      {/* 1. Top Contributor Header - Light card, NO XP numbers */}
      <section className="min-w-0 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 sm:p-8 space-y-5 shadow-[var(--shadow-neutral)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium">
            <span>Epapers Contributor</span>
            <span>·</span>
            <span>Academic Archive</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <span>DIT</span>
          </div>
        </div>

        {/* User profile + stats row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pt-1">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <UsernameTile
              username={user.username}
              size="xl"
              avatarId={user.avatarId}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="min-w-0 break-all font-bold text-xl sm:text-2xl text-[var(--color-text)]">
                  @{user.username}
                </h1>
                <LevelBadge level={user.level} title={user.levelTitle} size="sm" />
              </div>
              <p className="text-[var(--color-text-muted)] text-xs sm:text-sm mt-1">
                {user.submissionsCount} examination submissions recorded.
              </p>
            </div>
          </div>

          {/* Metric tiles - NO XP numbers */}
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:w-auto">
            <div className="min-w-0 bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-xl px-3 py-3 text-left sm:text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Rank
              </span>
              <span className="font-bold text-base text-[var(--color-text)]">
                {leaderboard.find(row => row.username === user.username)?.rank ? `#${leaderboard.find(row => row.username === user.username)?.rank}` : 'Unranked'}
              </span>
            </div>

            <div className="min-w-0 bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-xl px-3 py-3 text-left sm:text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Acceptance
              </span>
              <span className="font-bold text-base text-[var(--color-success)]">
                {user.acceptanceRate}%
              </span>
            </div>

            <div className="col-span-2 min-w-0 bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-xl px-3 py-3 text-left sm:col-span-1 sm:text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Approved
              </span>
              <span className="font-bold text-base text-[var(--color-text)]">
                {user.approvedCount} Papers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Metric Cards */}
      <section aria-label="Your archive activity" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-neutral)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Uploads Approved
          </span>
          <div className="mt-2">
            <span className="font-bold text-xl sm:text-2xl text-[var(--color-text)] break-words">
              {user.approvedCount} Papers
            </span>
            <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
              Available in campus search
            </span>
          </div>
        </div>

        <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-neutral)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Marking Schemes
          </span>
          <div className="mt-2">
            <span className="font-bold text-xl sm:text-2xl text-[var(--color-text)] break-words">
              {user.markingSchemesCount} Official
            </span>
            <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
              Verified answer rubrics
            </span>
          </div>
        </div>

        <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-neutral)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Total Submissions
          </span>
          <div className="mt-2">
            <span className="font-bold text-xl sm:text-2xl text-[var(--color-text)] break-words">
              {user.submissionsCount} Files
            </span>
            <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
              Tests, UE & Supplementary
            </span>
          </div>
        </div>

        <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-neutral)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Badges Earned
          </span>
          <div className="mt-2">
            <span className="font-bold text-xl sm:text-2xl text-[var(--color-text)] break-words">
              {achievements.filter((achievement) => achievement.isUnlocked).length} Earned
            </span>
            <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
              Archival milestones
            </span>
          </div>
        </div>
      </section>

      {/* 3. Main Split View: Left Content & Right Sidebar */}
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column (Span 2) */}
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {/* Achievements Gallery - Flat tiles, NO XP numbers */}
          <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 space-y-4 shadow-[var(--shadow-neutral)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-[var(--color-text)]">
                  Achievements Gallery
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Milestones validated by the Moderation Directorate.
                </p>
              </div>

              {/* Filter tabs */}
              <div role="group" aria-label="Filter achievements" className="grid grid-cols-2 sm:flex items-center gap-1.5 p-1 bg-[var(--color-sidebar)] rounded-xl text-xs font-medium">
                <button
                  onClick={() => setAchievementFilter('all')}
                  aria-pressed={achievementFilter === 'all'}
                  className={`min-h-11 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    achievementFilter === 'all'
                      ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  All ({achievements.length})
                </button>
                <button
                  onClick={() => setAchievementFilter('unlocked')}
                  aria-pressed={achievementFilter === 'unlocked'}
                  className={`min-h-11 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    achievementFilter === 'unlocked'
                      ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  Earned ({achievements.filter((ach) => ach.isUnlocked).length})
                </button>
                <button
                  onClick={() => setAchievementFilter('progress')}
                  aria-pressed={achievementFilter === 'progress'}
                  className={`min-h-11 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    achievementFilter === 'progress'
                      ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  In Progress ({achievements.filter((ach) => !ach.isUnlocked && ach.progress > 0).length})
                </button>
                <button
                  onClick={() => setAchievementFilter('locked')}
                  aria-pressed={achievementFilter === 'locked'}
                  className={`min-h-11 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    achievementFilter === 'locked'
                      ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  Locked ({achievements.filter((ach) => !ach.isUnlocked && ach.progress === 0).length})
                </button>
              </div>
            </div>

            {/* Badges 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`min-w-0 p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                    ach.isUnlocked
                      ? 'bg-[var(--color-surface)] border-[var(--color-border)]'
                      : ach.progress > 0
                      ? 'bg-[var(--color-input)] border-[var(--color-input-border)]'
                      : 'bg-[var(--color-canvas)] border-[var(--color-border)] text-[var(--color-neutral)]'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-[var(--color-text)]">
                        {ach.title}
                      </span>
                      {ach.isUnlocked ? (
                        <span className="text-[11px] font-semibold text-[var(--color-success)]">
                          Earned
                        </span>
                      ) : ach.progress > 0 ? (
                        <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                          {Math.round((ach.progress / ach.maxProgress) * 100)}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--color-neutral)]">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] leading-snug">
                      {ach.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] flex justify-between items-center">
                    <span>{ach.isUnlocked ? `Earned ${ach.unlockedDate ? new Date(ach.unlockedDate).toLocaleDateString() : 'recently'}` : 'In progress'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {/* DIT Leaderboard Preview - NO XP numbers on Dashboard */}
          <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[var(--shadow-neutral)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text)]">
                  Epapers Leaderboard
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Epapers standings
                </p>
              </div>
              <Link
                to="/leaderboard"
                className="text-xs text-[var(--color-primary)] font-semibold hover:underline"
              >
                Leaderboard →
              </Link>
            </div>

            <div className="space-y-1.5">
              {leaderboard.slice(0, 5).map((lUser) => {
                const isCurrentUser = lUser.username === user.username;
                return (
                  <div
                    key={lUser.id}
                    className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg transition-colors ${
                      isCurrentUser
                        ? 'bg-[var(--color-active)]'
                        : 'hover:bg-[var(--color-canvas)]'
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-[var(--color-text-muted)] w-5 text-center">
                        #{lUser.rank}
                      </span>
                      <UsernameTile
                        username={lUser.username}
                        size="sm"
                        avatarId={lUser.avatarId}
                      />
                      <span className="text-xs text-[var(--color-text)] truncate">
                        @{lUser.username}
                        {isCurrentUser && <span className="ml-1 text-[10px] text-[var(--color-primary)] font-bold">(You)</span>}
                      </span>
                    </div>

                    <LevelBadge level={lUser.level} title={lUser.levelTitle} size="sm" />
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
              Rankings update upon moderation approval. Visit the leaderboard page for complete points.
            </div>
          </div>

          {/* Suggested Contributions */}
          <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 space-y-3 shadow-[var(--shadow-neutral)]">
            <h3 className="font-bold text-sm text-[var(--color-text)]">
              Suggested Contributions
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Recent examination papers requested by students, ranked by demand.
            </p>

            <div className="space-y-2.5 pt-1">
              {suggestions.length ? suggestions.map(item => {
                const params = new URLSearchParams({ moduleId: item.moduleId, moduleCode: item.moduleCode, category: item.category, academicYear: String(item.academicYear) });
                if (item.testNumber) params.set('testNumber', String(item.testNumber));
                if (item.wantsMarkingScheme) params.set('scheme', 'true');
                return <div key={`${item.moduleId}-${item.category}-${item.testNumber}-${item.academicYear}-${item.wantsMarkingScheme}`} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] space-y-1">
                  <span className="font-semibold text-xs text-[var(--color-text)] block">{item.moduleCode} · {item.category === 'TEST' ? `Test ${item.testNumber}` : item.category} · {item.academicYear}{item.wantsMarkingScheme ? ' marking scheme' : ''}</span>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{item.requestsThisWeek} {item.requestsThisWeek === 1 ? 'request' : 'requests'} this week for {item.moduleName}.</p>
                  <Link to={`/upload?${params}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline pt-1">
                    <span>{item.wantsMarkingScheme ? 'Upload Paper + Key' : 'Upload Paper'}</span><ArrowRight className="w-3 h-3" />
                  </Link>
                </div>;
              }) : <p className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-xs text-[var(--color-text-muted)]">{suggestionsError ? 'Paper requests could not be loaded right now.' : 'No paper requests this week yet. New requests will appear here.'}</p>}
            </div>
          </div>

          {/* Eapers Archival Standards Checklist */}
          <div className="min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-[var(--shadow-neutral)]">
            <h3 className="font-bold text-sm text-[var(--color-text)]">
              Eapers Archival Standards
            </h3>

            <ul className="space-y-2 text-xs text-[var(--color-text-muted)]">
              <li className="flex items-start gap-1.5">
                <span className="text-[var(--color-primary)] font-bold">·</span>
                <span>All uploads must be official DIT examination papers.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[var(--color-danger)] font-bold">·</span>
                <span>Illegible scans or duplicate submissions will be rejected.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[var(--color-primary)] font-bold">·</span>
                <span>Marking schemes must correlate with official department grading benchmarks.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
