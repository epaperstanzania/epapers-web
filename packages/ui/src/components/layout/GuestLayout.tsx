'use client';
import React, { useState } from 'react';
import { LogoutButton } from '../common/LogoutButton';
import { NavLink, Link } from '@epapers/ui/navigation';
import { EPapersLogo } from '../common/EPapersLogo';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import {
  Home,
  Search,
  BookOpen,
  Clock,
  TrendingUp,
  HelpCircle,
  FileQuestion,
  Info,
  ChevronLeft,
  ChevronRight,
  Upload,
  PlusCircle,
  X,
} from 'lucide-react';

export const GuestLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems = [
    { label: 'Explore Home', to: '/', icon: Home },
    { label: 'Search Papers', to: '/search', icon: Search },
    { label: 'Departments', to: '/departments', icon: BookOpen },
    { label: 'Recent Uploads', to: '/recent', icon: Clock },
    { label: 'Popular Papers', to: '/popular', icon: TrendingUp },
    { label: 'Request Module', to: '/request-module', icon: PlusCircle },
    { label: 'User guide', to: '/how-it-works', icon: HelpCircle },
    { label: 'FAQ', to: '/faq', icon: FileQuestion },
    { label: 'About EPapers', to: '/about', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] flex">
      {/* Desktop Light Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] text-[var(--color-text)] transition-all duration-150 z-40 sticky top-0 h-screen shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-sidebar-border)]">
          <Link to="/" className="truncate">
            <EPapersLogo collapsed={collapsed} showContextLabel={true} />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-[var(--color-neutral)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Button: Quick Upload */}
        <div className="p-3">
          <Link
            to="/upload"
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold hover:bg-[var(--color-primary-dark)] transition-colors ${
              collapsed ? 'px-0' : 'px-4'
            }`}
            title="Upload Exam Paper"
          >
            <Upload className="w-4 h-4 text-[var(--color-accent)]" />
            {!collapsed && <span>Upload Paper</span>}
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group relative ${
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
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                      } ${collapsed ? 'mx-auto' : ''}`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-3 border-t border-[var(--color-sidebar-border)] text-[11px] text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text)]">EPapers · DIT</p>
            <p className="mt-0.5">SourceExam Archive</p>
            <div className="flex gap-2 mt-1.5 text-[10px]">
              <Link to="/terms" className="hover:underline">Terms</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <span>·</span>
              <Link to="/takedown" className="hover:underline">Takedown</Link>
            </div>
          </div>
        )}
        <LogoutButton collapsed={collapsed} />
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-[var(--color-text)]/40" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-[280px] max-w-[80vw] bg-[var(--color-sidebar)] h-full flex flex-col p-4 shadow-sm z-50 border-r border-[var(--color-sidebar-border)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-sidebar-border)]">
              <EPapersLogo collapsed={false} />
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded text-[var(--color-neutral)] hover:text-[var(--color-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                          }`}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <LogoutButton onLogout={() => setMobileDrawerOpen(false)} />

            <div className="pt-3 border-t border-[var(--color-sidebar-border)]">
              <Link
                to="/upload"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-input)] text-xs font-semibold"
              >
                <Upload className="w-4 h-4 text-[var(--color-accent)]" />
                <span>Upload Paper</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <TopBar onOpenMobileDrawer={() => setMobileDrawerOpen(true)} variant="guest" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
};
