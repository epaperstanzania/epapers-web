'use client';
import React from 'react';

interface LevelBadgeProps {
  level: number;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  title,
  size = 'md',
  className = '',
}) => {
  const getLevelTitle = () => {
    if (title) return title;
    switch (level) {
      case 1:
        return 'Novice Archivist';
      case 2:
        return 'Scholar';
      case 3:
        return 'Senior Curator';
      case 4:
      default:
        return 'Master Archivist';
    }
  };

  const paddingSizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-xs',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md bg-[var(--color-active)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 ${paddingSizes} ${className}`}
    >
      {getLevelTitle()}
    </span>
  );
};
