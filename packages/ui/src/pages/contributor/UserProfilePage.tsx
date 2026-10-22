'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { UserProfile, Paper } from '../../types';
import { UsernameTile, DEFAULT_AVATARS, resolveAvatarId } from '../../components/common/UsernameTile';
import { LevelBadge } from '../../components/common/LevelBadge';
import { PaperCard } from '../../components/common/PaperCard';
import { Edit3, Check } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { busy, run } = useApiAction();
  const { username } = useParams<{ username: string }>();
  const { currentUser, updateBioAndAvatar } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPapers, setUserPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing state for own profile
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('initials');

  const isOwnProfile =
    currentUser && username?.toLowerCase() === currentUser.username.toLowerCase();

  useEffect(() => {
    const loadUser = apiTask(async () => {
      if (!username) return;
      setLoading(true);
      const [u, allPapers] = await Promise.all([
        api.getUserProfile(username),
        api.getAllPapers(false),
      ]);
      setProfile(u);
      if (u) {
        setBioInput(u.bio);
        setSelectedAvatar(resolveAvatarId(u.username, u.avatarId));
        const userApproved = allPapers.filter(
          (p) => p.uploadedBy.username === u.username && p.status === 'APPROVED'
        );
        setUserPapers(userApproved);
      }
      setLoading(false);
    }, () => setLoading(false));
    loadUser();
  }, [username]);

  const handleSaveProfile = run(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await updateBioAndAvatar(bioInput, selectedAvatar);
    setProfile({ ...profile, bio: bioInput, avatarId: selectedAvatar });
    setIsEditing(false);
  }, () => setLoading(false));

  if (loading) return <PageLoader variant="detail" label="Loading content…" />;

  if (!profile) {
    return (
      <div className="p-10 text-center bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] max-w-md mx-auto">
        <h2 className="font-bold text-base text-[var(--color-text)]">
          Archivist Not Found
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          No profile exists under @{username} at DIT.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block px-4 py-2 bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold rounded-lg"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (<BusyScope busy={busy}><div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <UsernameTile
              username={profile.username}
              size="xl"
              avatarId={profile.avatarId}
            />

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-xl sm:text-2xl text-[var(--color-text)]">
                  @{profile.username}
                </h1>
                {profile.isLecturerVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-sidebar)] px-2 py-0.5 rounded border border-[var(--color-sidebar-border)]">
                    <Check className="w-3 h-3 text-[var(--color-primary)]" />
                    <span>Verified Faculty</span>
                  </span>
                )}
                <LevelBadge level={profile.level} title={profile.levelTitle} size="sm" />
              </div>

              <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                <span>Joined {new Date(profile.joinedDate).toLocaleDateString()}</span>
                <span>·</span>
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-input-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-input)] cursor-pointer transition-colors"
            >
              <Edit3 className="w-4 h-4 text-[var(--color-primary)]" />
              <span>{isEditing ? 'Cancel Editing' : 'Customize Profile'}</span>
            </button>
          )}
        </div>

        {/* Bio or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="p-4 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)] space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
                Archivist Bio
              </label>
              <textarea
                rows={3}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Write a brief scholarly bio (program, campus year)..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-input-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
                Default avatar
              </label>
              <div className="flex items-center gap-2">
                {DEFAULT_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    aria-label={`${avatar.label} avatar`}
                    aria-pressed={selectedAvatar === avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`rounded-full transition-transform cursor-pointer ${
                      selectedAvatar === avatar.id ? 'scale-110 ring-2 ring-offset-2 ring-[var(--color-neutral)]' : ''
                    }`}
                  >
                    <UsernameTile username={profile.username} avatarId={avatar.id} size="md" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold hover:bg-[var(--color-primary-dark)]"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
            {profile.bio || 'DIT scholar archiving examination memory.'}
          </p>
        )}

        {/* Stats Grid - NO XP NUMBERS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--color-border)]">
          <div className="p-3 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)] text-center">
            <span className="block text-[11px] text-[var(--color-text-muted)]">Standing</span>
            <span className="font-bold text-sm text-[var(--color-primary)]">
              {profile.levelTitle}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)] text-center">
            <span className="block text-[11px] text-[var(--color-text-muted)]">Approved Papers</span>
            <span className="font-bold text-base text-[var(--color-text)]">
              {profile.approvedCount}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)] text-center">
            <span className="block text-[11px] text-[var(--color-text-muted)]">Marking Schemes</span>
            <span className="font-bold text-base text-[var(--color-success)]">
              {profile.markingSchemesCount}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)] text-center">
            <span className="block text-[11px] text-[var(--color-text-muted)]">Acceptance Rate</span>
            <span className="font-bold text-base text-[var(--color-text)]">
              {profile.acceptanceRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Verified Papers Archived by User */}
      <div className="space-y-4">
        <h2 className="font-bold text-base text-[var(--color-text)]">
          Verified Papers by @{profile.username} ({userPapers.length})
        </h2>

        {userPapers.length === 0 ? (
          <div className="p-8 text-center bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            No verified papers in the repository yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userPapers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div></BusyScope>);
};
