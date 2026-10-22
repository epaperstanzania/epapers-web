'use client';
import React from 'react';
import { ExamCategory, PaperStatus } from '../../types';
import { Check } from 'lucide-react';

interface CategoryChipProps {
  category: ExamCategory;
  className?: string;
  size?: 'sm' | 'md';
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ category, className = '', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (category === 'TEST') {
    return (
      <span
        className={`inline-flex items-center font-semibold uppercase rounded ${sizeClasses} bg-[var(--color-sidebar)] text-[var(--color-primary)] border border-[var(--color-sidebar-border)] ${className}`}
      >
        TEST
      </span>
    );
  }

  if (category === 'UE') {
    return (
      <span
        className={`inline-flex items-center font-semibold uppercase rounded ${sizeClasses} bg-[var(--color-active)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 ${className}`}
      >
        UE
      </span>
    );
  }

  // SUPP
  return (
    <span
      className={`inline-flex items-center font-semibold uppercase rounded ${sizeClasses} bg-[var(--color-canvas)] text-[var(--color-text-muted)] border border-[var(--color-input-border)] ${className}`}
    >
      SUPP
    </span>
  );
};

interface StatusChipProps {
  status: PaperStatus;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[var(--color-warning-soft)] text-[var(--color-warning-text)] border border-[var(--color-warning)]/30 ${className}`}
        >
          Pending
        </span>
      );
    case 'APPROVED':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/20 ${className}`}
        >
          Approved
        </span>
      );
    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/20 ${className}`}
        >
          Rejected
        </span>
      );
    case 'SPAM':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 ${className}`}
        >
          Blocked
        </span>
      );
    default:
      return null;
  }
};

interface LecturerBadgeProps {
  className?: string;
}

export const LecturerBadge: React.FC<LecturerBadgeProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-sidebar)] text-[var(--color-primary)] border border-[var(--color-sidebar-border)] select-none ${className}`}
    >
      <Check className="w-3 h-3 text-[var(--color-primary)]" />
      <span> Lecturer</span>
    </span>
  );
};
