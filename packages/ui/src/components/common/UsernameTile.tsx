'use client';
import React from 'react';
import { Atom, BookOpen, GraduationCap, Laptop, Lightbulb, UserRound } from 'lucide-react';
import { profileImageUrl } from '../../services/api';

interface UsernameTileProps {
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  avatarId?: string;
  showDetails?: boolean;
  levelTitle?: string;
  role?: string;
  isLecturerVerified?: boolean;
  className?: string;
}

export const DEFAULT_AVATARS = [
  { id: 'initials', label: 'Initials', icon: null },
  { id: 'student', label: 'Student', icon: UserRound },
  { id: 'graduate', label: 'Graduate', icon: GraduationCap },
  { id: 'reader', label: 'Reader', icon: BookOpen },
  { id: 'scientist', label: 'Scientist', icon: Atom },
  { id: 'thinker', label: 'Thinker', icon: Lightbulb },
  { id: 'tech', label: 'Technology', icon: Laptop },
] as const;

export function getDefaultAvatarId(username: string): string {
  if (!username) return DEFAULT_AVATARS[0].id;
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length].id;
}

export function resolveAvatarId(username: string, avatarId?: string): string {
  return DEFAULT_AVATARS.some((avatar) => avatar.id === avatarId)
    ? avatarId!
    : getDefaultAvatarId(username);
}

export const UsernameTile: React.FC<UsernameTileProps> = ({
  username,
  size = 'md',
  avatarId,
  showDetails = false,
  levelTitle,
  role,
  isLecturerVerified,
  className = '',
}) => {
  const initial = (username?.[0] || 'U').toUpperCase();
  const selectedAvatar = DEFAULT_AVATARS.find((avatar) => avatar.id === resolveAvatarId(username, avatarId))!;
  const uploaded = !!avatarId && /^p_[a-f0-9]{30}$/.test(avatarId);
  const AvatarIcon = selectedAvatar.icon;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs rounded-full',
    md: 'w-8 h-8 text-xs rounded-full',
    lg: 'w-10 h-10 text-sm rounded-full',
    xl: 'w-12 h-12 text-base rounded-full',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Simple default avatar */}
      <div
        className={`${sizeClasses} shrink-0 flex items-center justify-center bg-[var(--color-sidebar)] text-[var(--color-neutral)] select-none`}
        title={`${uploaded ? 'Profile photo' : selectedAvatar.label + ' avatar'} for @${username}`}
      >
        {uploaded ? <img src={profileImageUrl(avatarId!)} alt="" className="h-full w-full rounded-full object-cover" /> : AvatarIcon ? <AvatarIcon className="w-1/2 h-1/2" strokeWidth={1.8} /> : <span className="font-bold">{initial}</span>}
      </div>

      {showDetails && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-semibold text-xs text-[var(--color-text)] truncate">
              @{username}
            </span>
            {isLecturerVerified && (
              <span className="text-[10px] font-medium text-[var(--color-primary)]">
                · Verified
              </span>
            )}
          </div>
          {(levelTitle || role) && (
            <span className="text-[11px] text-[var(--color-text-muted)] truncate">
              {levelTitle || (role ? role.toUpperCase() : '')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
