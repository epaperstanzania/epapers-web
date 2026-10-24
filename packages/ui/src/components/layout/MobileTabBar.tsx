'use client';
import React from 'react';
import { NavLink } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { Home, Search, BookOpen, Plus, User, LayoutDashboard } from 'lucide-react';

export const MobileTabBar: React.FC<{ onContribute?: () => void }> = ({ onContribute }) => {
  const { role, currentUser } = useAuth();

  const getProfileLink = () => {
    if (role === 'admin') return '/admin';
    if (currentUser) return '/dashboard';
    return '/login';
  };

  const getProfileLabel = () => {
    if (role === 'admin') return 'Admin';
    if (currentUser) return 'Dashboard';
    return 'Log In';
  };

  const ProfileIcon = role === 'admin' ? LayoutDashboard : User;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-3 flex items-center justify-around shadow-xs">
      <NavLink
        to={role === 'admin' ? '/admin' : currentUser ? '/dashboard' : '/'}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-semibold transition-colors ${
            isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`
        }
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </NavLink>

      <NavLink
        to={currentUser && role !== 'admin' ? '/browse' : '/search'}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-semibold transition-colors ${
            isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`
        }
      >
        <Search className="w-5 h-5" />
        <span>Search</span>
      </NavLink>

      {currentUser && role !== 'admin' ? <NavLink
        to="/upload"
        className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-semibold text-[var(--color-primary)]"
      >
        <div className="w-9 h-9 -mt-4 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shadow-xs border-2 border-[var(--color-surface)]">
          <Plus aria-hidden="true" className="h-5 w-5 text-[var(--color-input)]" strokeWidth={2.5} />
        </div>
        <span className="text-[10px]">Upload</span>
      </NavLink> : <button type="button" onClick={onContribute} className="flex min-w-[56px] flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold text-[var(--color-primary)]"><Plus className="h-5 w-5"/><span>Contribute</span></button>}

      <NavLink
        to={currentUser && role !== 'admin' ? '/browse' : '/departments'}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-semibold transition-colors ${
            isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`
        }
      >
        <BookOpen className="w-5 h-5" />
        <span>Browse</span>
      </NavLink>

      {(currentUser || role === 'admin') && (
        <NavLink
          to={getProfileLink()}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 text-[11px] font-semibold transition-colors ${
              isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`
          }
        >
          <ProfileIcon className="w-5 h-5" />
          <span>{getProfileLabel()}</span>
        </NavLink>
      )}
    </nav>
  );
};
