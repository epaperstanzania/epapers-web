'use client';
import { PageLoader } from '../common/PageLoader';
import { LogoutButton } from '../common/LogoutButton';
import React, { useState } from 'react';
import { NavLink, Link, Navigate, useLocation } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { EPapersLogo } from '../common/EPapersLogo';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import { UsernameTile } from '../common/UsernameTile';
import { LevelBadge } from '../common/LevelBadge';
import {
  LayoutDashboard,
  FileCheck2,
  Award,
  Trophy,
  BookOpen,
  PlusCircle,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  FolderSync,
  Layers,
  X,
} from 'lucide-react';

export const ContributorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isLecturer = role === 'lecturer' || currentUser?.isLecturerVerified;

  if (loading) return <PageLoader variant="cards" label="Restoring your session…" fullPage />;

  if (role === 'guest') {
    return <Navigate to="/login" replace state={{ message: location.pathname === '/leaderboard' ? 'The leaderboard is for contributors. Join to see where you rank.' : 'Sign in to access your contributor workspace.' }} />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Submissions', to: '/dashboard/submissions', icon: FileCheck2 },
    { label: 'Achievements', to: '/dashboard/achievements', icon: Award },
    { label: 'Leaderboard', to: '/leaderboard', icon: Trophy },
    { label: 'Browse Papers', to: '/browse', icon: BookOpen },
    { label: 'Request Module', to: '/dashboard/request-module', icon: PlusCircle },
  ];

  const lecturerItems = [
    { label: 'Faculty Papers', to: '/lecturer/papers', icon: Layers },
    { label: 'Bulk Upload', to: '/lecturer/bulk-upload', icon: FolderSync },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] flex">
      {/* Light Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[var(--color-sidebar)] text-[var(--color-text)] transition-all duration-150 z-40 sticky top-0 h-screen shrink-0 border-r border-[var(--color-sidebar-border)] ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-sidebar-border)]">
          <Link to="/dashboard" className="truncate flex items-center gap-2">
            <EPapersLogo collapsed={collapsed} contextLabel="Contributor" />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-[var(--color-neutral)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Upload Button */}
        <div className="p-3">
          <Link
            to="/upload"
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold hover:bg-[var(--color-primary-dark)] transition-colors ${
              collapsed ? 'px-0' : 'px-4'
            }`}
          >
            <Upload className="w-4 h-4 text-[var(--color-accent)]" />
            {!collapsed && <span>Upload Paper</span>}
          </Link>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                      } ${collapsed ? 'mx-auto' : ''}`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* Lecturer specific tools */}
          {isLecturer && (
            <div className="pt-3 mt-3 border-t border-[var(--color-sidebar-border)]">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Faculty Portal
                </div>
              )}
              {lecturerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                          } ${collapsed ? 'mx-auto' : ''}`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* Settings & Help */}
          <div className="pt-3 mt-3 border-t border-[var(--color-sidebar-border)]">
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                }`
              }
              title={collapsed ? 'Settings' : undefined}
            >
              {({ isActive }) => (
                <>
                  <Settings
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                    } ${collapsed ? 'mx-auto' : ''}`}
                  />
                  {!collapsed && <span>Settings</span>}
                </>
              )}
            </NavLink>

            <NavLink
              to="/help"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                }`
              }
              title={collapsed ? 'Help' : undefined}
            >
              {({ isActive }) => (
                <>
                  <HelpCircle
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                    } ${collapsed ? 'mx-auto' : ''}`}
                  />
                  {!collapsed && <span>Help</span>}
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* Bottom Contributor Status Card - NO XP numbers */}
        {!collapsed && currentUser && (
          <div className="p-2.5 m-2 rounded-lg bg-[var(--color-active)] border border-[var(--color-sidebar-border)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UsernameTile
                username={currentUser.username}
                size="sm"
                avatarId={currentUser.avatarId}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-[var(--color-text)] truncate">
                  @{currentUser.username}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {currentUser.levelTitle}
                </span>
              </div>
            </div>
            <LevelBadge level={currentUser.level} title={currentUser.levelTitle} size="sm" />
          </div>
        )}
        <LogoutButton collapsed={collapsed} />
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-[var(--color-text)]/40" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-[280px] max-w-[80vw] bg-[var(--color-sidebar)] text-[var(--color-text)] h-full flex flex-col p-4 z-50 border-r border-[var(--color-sidebar-border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-sidebar-border)]">
              <EPapersLogo collapsed={false} />
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded text-[var(--color-neutral)] hover:text-[var(--color-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <Link
                to="/upload"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold"
              >
                <Upload className="w-4 h-4 text-[var(--color-accent)]" />
                <span>Upload Paper</span>
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'}`}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
              <NavLink to="/dashboard/settings" onClick={() => setMobileDrawerOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium hover:bg-[var(--color-hover)]">
                <Settings className="h-4 w-4" /> Settings
              </NavLink>
            </nav>
            <LogoutButton onLogout={() => setMobileDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <TopBar onOpenMobileDrawer={() => setMobileDrawerOpen(true)} variant="contributor" />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          <div key={location.pathname} className="epapers-page-transition">{children}</div>
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
};
