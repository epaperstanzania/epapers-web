'use client';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Link, useNavigate } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { UsernameTile } from '../common/UsernameTile';
import { Bell, Search, Menu } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

interface TopBarProps {
  onToggleSidebar?: () => void;
  onOpenMobileDrawer?: () => void;
  variant?: 'guest' | 'contributor' | 'admin';
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  onOpenMobileDrawer,
  variant = 'guest',
}) => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    setUnread(0);
    if (!currentUser?.id) return;
    let active = true, inFlight = false;
    const refresh = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const notifications = await api.getNotifications(currentUser.id);
        if (active) setUnread(notifications.filter(notification => !notification.read).length);
      } catch { /* The API client displays connection errors. */ }
      finally { inFlight = false; }
    };
    const onRefresh = () => { void refresh(); };
    void refresh();
    const timer = setInterval(onRefresh, 60000);
    window.addEventListener('focus', onRefresh);
    window.addEventListener('epapers-notifications-read', onRefresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', onRefresh); window.removeEventListener('epapers-notifications-read', onRefresh); };
  }, [currentUser?.id]);

  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Mobile navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileDrawer}
          className="lg:hidden p-1.5 -ml-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)] cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

      </div>

      {/* Center Search quick trigger (desktop) */}
      <div className="hidden md:flex items-center max-w-xs w-full">
        <button
          type="button"
          onClick={() => navigate(variant === 'contributor' ? '/browse' : '/search')}
          aria-label="Search examination papers"
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[var(--color-neutral)]" />
          <span className="truncate">Search modules, e.g. COE 07201...</span>
          <kbd className="ml-auto text-[10px] bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-input-border)] font-mono text-[var(--color-text-muted)]">
            /
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <ThemeToggle />

        {/* Notifications (if logged in) */}
        {currentUser && (
          <Link
            to={role === 'admin' ? '/admin/notifications' : '/dashboard/notifications'}
            className="relative p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)] transition-colors"
            title="Notifications"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[var(--color-danger)] px-1 text-center text-[9px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span>}
          </Link>
        )}

        {/* User state / Quick Actions */}
        {currentUser ? (
          <Link
            to={role === 'admin' ? '/admin' : role === 'lecturer' ? '/lecturer' : '/dashboard'}
            className="flex items-center gap-2 pl-1 group cursor-pointer"
            aria-label={`Open ${role === 'admin' ? 'admin' : role === 'lecturer' ? 'lecturer' : 'contributor'} dashboard`}
          >
            <UsernameTile
              username={currentUser.username}
              size="sm"
              avatarId={currentUser.avatarId}
            />
            <div className="hidden xl:flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                @{currentUser.username}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {currentUser.levelTitle}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-sidebar)] transition-colors"
            >
              <span>Contribute</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
