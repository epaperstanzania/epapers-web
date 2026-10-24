'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { Link } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { UserProfile } from '../../types';
import { UsernameTile } from '../../components/common/UsernameTile';
import { LevelBadge } from '../../components/common/LevelBadge';

export const LeaderboardPage: React.FC = () => {
  const { currentUser, isGuest } = useAuth();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Enforce Product Rule: Guests who open /leaderboard are redirected to /login with specific message!

  useEffect(() => {
    const loadBoard = apiTask(async () => {
      setLoading(true);
      const data = await api.getLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    }, () => setLoading(false));
    loadBoard();
  }, []);

  if (isGuest) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl text-[var(--color-text)] ">
            Archive Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Epapers standings based on verified past paper submissions, marking schemes, and peer utility.
          </p>
        </div>

        <div className="px-4 py-2 bg-[var(--color-blue-tint)]  rounded-lg border border-[var(--color-accent)]/30 text-xs text-[var(--color-primary)]  font-bold">
          {leaderboard.some(row => row.username === currentUser?.username) ? `Your standing: #${leaderboard.find(row => row.username === currentUser?.username)?.rank} (${leaderboard.find(row => row.username === currentUser?.username)?.xp} XP)` : 'No leaderboard entry yet'}
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)]  flex items-center justify-between text-xs font-bold text-[var(--color-neutral)] uppercase tracking-wider">
          <span>Rank & Archivist</span>
          <span className="text-right">Stats & Accrued XP</span>
        </div>

        {loading ? <PageLoader variant="rows" label="Loading content…" compact /> : (
          <div className="divide-y divide-[var(--color-border)] ">
            {leaderboard.map((user, idx) => {
              const isCurrent = user.username === currentUser?.username;
              const rank = user.rank || idx + 1;

              return (
                <div
                  key={user.id}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                    isCurrent
                      ? 'bg-[var(--color-blue-tint)]/70  border-l-4 border-[var(--color-accent)]'
                      : 'hover:bg-[var(--color-input)] '
                  }`}
                >
                  {/* Left: Rank + Tile + Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-8 flex items-center justify-center font-mono font-bold text-sm shrink-0 text-[var(--color-text-muted)] ">
                      #{rank}
                    </div>

                    <Link to={`/u/${user.username}`} aria-label={`View @${user.username}'s profile`} className="shrink-0 rounded-full ring-2 ring-[var(--color-border)] ring-offset-2 ring-offset-[var(--color-surface)] hover:ring-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]">
                      <UsernameTile username={user.username} size="lg" avatarId={user.avatarId} />
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/u/${user.username}`}
                          className="font-bold text-sm text-[var(--color-text)]  hover:text-[var(--color-primary)]  truncate"
                        >
                          @{user.username}
                        </Link>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-surface)]">
                            YOU
                          </span>
                        )}
                        {user.isLecturerVerified && (
                          <span className="text-[10px] font-bold text-[var(--color-success)] bg-[var(--color-success-soft)] px-1.5 py-0.5 rounded">
                            Faculty
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-muted)]">
                        <LevelBadge level={user.level} title={user.levelTitle} size="sm" />
                        <span className="hidden sm:inline">· {user.approvedCount} papers</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: XP Score */}
                  <div className="text-right shrink-0">
                    <span className="font-bold text-base sm:text-lg text-[var(--color-primary)]  font-mono tabular-nums">
                      {user.xp} XP
                    </span>
                    <span className="block text-[11px] text-[var(--color-neutral)] mt-0.5">
                      {user.acceptanceRate}% Acceptance
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
