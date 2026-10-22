'use client';
import React from 'react';

interface EPapersLogoProps {
  collapsed?: boolean;
  className?: string;
  showContextLabel?: boolean;
}

export const EPapersLogo: React.FC<EPapersLogoProps> = ({
  collapsed = false,
  className = '',
  showContextLabel = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/E-Papers-logo.png"
        alt=""
        aria-hidden="true"
        className="h-8 w-8 shrink-0 object-contain"
      />

      {/* Wordmark */}
      {!collapsed && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className="font-heading font-extrabold text-[19px] tracking-tight text-[var(--color-primary)]"
            >
              EPapers
            </span>
          </div>
          <span
            className="text-[9.5px] font-medium tracking-wider uppercase mt-0.5 text-[var(--color-neutral)]"
          >
            Exam Papers
          </span>
        </div>
      )}
    </div>
  );
};
