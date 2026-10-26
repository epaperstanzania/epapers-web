'use client';
import { PageLoader } from '../common/PageLoader';
import { LogoutButton } from '../common/LogoutButton';
import React, { useEffect, useState } from 'react';
import { NavLink, Link, Navigate, useLocation } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { EPapersLogo } from '../common/EPapersLogo';
import { TopBar } from './TopBar';
import {
  LayoutDashboard,
  Split,
  Flag,
  FileMinus,
  PlusSquare,
  FileStack,
  FolderTree,
  Users,
  GraduationCap,
  History,
  Radio,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  X,
} from 'lucide-react';

const ADMIN_NAV_GROUPS = [
  {
    title: 'Moderation Console',
    items: [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard },
      { label: 'Review Queue', to: '/admin/review', icon: Split },
      { label: 'Flagged Reports', to: '/admin/flags', icon: Flag },
      { label: 'Takedowns', to: '/admin/takedowns', icon: FileMinus },
      { label: 'Archive Requests', to: '/admin/module-requests', icon: PlusSquare },
    ],
  },
  {
    title: 'Curriculum & Papers',
    items: [
      { label: 'All Exam Papers', to: '/admin/papers', icon: FileStack },
      { label: 'Structure (CRUD)', to: '/admin/structure', icon: FolderTree },
    ],
  },
  {
    title: 'Accounts & Faculty',
    items: [
      { label: 'User Directory', to: '/admin/users', icon: Users },
      { label: 'Faculty Verification', to: '/admin/lecturers', icon: GraduationCap },
    ],
  },
  {
    title: 'System & Governance',
    items: [
      { label: 'Audit Trail', to: '/admin/audit', icon: History },
      { label: 'System Health', to: '/admin/health', icon: Activity },
      { label: 'Communications', to: '/admin/communications', icon: Radio },
      { label: 'Site Settings', to: '/admin/settings', icon: Sliders },
    ],
  },
] as const;

function getActiveGroupTitle(pathname: string): string {
  return ADMIN_NAV_GROUPS.find((group) =>
    group.items.some((item) => item.to === '/admin' ? pathname === '/admin' : pathname.startsWith(item.to))
  )?.title || ADMIN_NAV_GROUPS[0].title;
}

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(() => getActiveGroupTitle(location.pathname));

  useEffect(() => {
    setOpenGroup(getActiveGroupTitle(location.pathname));
  }, [location.pathname]);

  if (loading) return <PageLoader variant="cards" label="Restoring your session…" fullPage />;
  if (role !== 'admin') {
    return <Navigate to="/login" replace state={{ message: 'Sign in with your administrator account and the code sent to your email.' }} />;
  }



  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] flex">
      {/* Light Admin Desktop Sidebar (denser layout, small ADMIN badge) */}
      <aside
        className={`hidden lg:flex flex-col bg-[var(--color-sidebar)] text-[var(--color-text)] transition-all duration-150 z-40 sticky top-0 h-screen shrink-0 border-r border-[var(--color-sidebar-border)] ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[var(--color-sidebar-border)]">
          <Link to="/admin" className="truncate flex items-center gap-2">
            <EPapersLogo collapsed={collapsed} showContextLabel={false} />
            {!collapsed && (
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-input)] uppercase">
                ADMIN
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-[var(--color-neutral)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Dense Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {ADMIN_NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {!collapsed && (
                <button
                  type="button"
                  aria-expanded={openGroup === group.title}
                  aria-controls={`admin-nav-${gIdx}`}
                  onClick={() => setOpenGroup((current) => current === group.title ? '' : group.title)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
                >
                  <span>{group.title}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${openGroup === group.title ? 'rotate-180' : ''}`} />
                </button>
              )}
              <div
                id={`admin-nav-${gIdx}`}
                aria-hidden={!collapsed && openGroup !== group.title}
                inert={!collapsed && openGroup !== group.title}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${collapsed || openGroup === group.title ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                            } ${collapsed ? 'mx-auto' : ''}`}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                      </>
                    )}
                  </NavLink>
                );
              })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Admin Info */}
        {!collapsed && (
          <div className="p-2.5 border-t border-[var(--color-sidebar-border)] text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[var(--color-text)] font-semibold">Moderation Board</span>
              <span className="text-[10px]">DIT Campus Archive</span>
            </div>
            <Link
              to="/"
              className="text-xs text-[var(--color-primary)] hover:underline font-medium"
            >
              Public Site →
            </Link>
          </div>
        )}
        <LogoutButton collapsed={collapsed} />
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="fixed inset-0 cursor-default bg-[var(--color-text)]/40"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div role="dialog" aria-modal="true" aria-label="Admin navigation" className="relative z-50 flex h-full w-[280px] max-w-[80vw] flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] p-4 text-[var(--color-text)] shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-sidebar-border)]">
              <div className="flex items-center gap-2">
                <EPapersLogo collapsed={false} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-surface)] uppercase">
                  ADMIN
                </span>
              </div>
              <button
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setMobileDrawerOpen(false)}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[var(--color-neutral)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-3">
              {ADMIN_NAV_GROUPS.map((group, idx) => (
                <div key={idx} className="space-y-0.5">
                  <button
                    type="button"
                    aria-expanded={openGroup === group.title}
                    aria-controls={`admin-mobile-nav-${idx}`}
                    onClick={() => setOpenGroup((current) => current === group.title ? '' : group.title)}
                    className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${openGroup === group.title ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    id={`admin-mobile-nav-${idx}`}
                    aria-hidden={openGroup !== group.title}
                    inert={openGroup !== group.title}
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${openGroup === group.title ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/admin'}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex min-h-11 items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[var(--color-active)] text-[var(--color-primary)] font-semibold'
                              : 'text-[var(--color-text)] hover:bg-[var(--color-hover)]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-4 h-4 ${
                                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-neutral)]'
                              }`}
                            />
                            <span>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </nav>
            <LogoutButton onLogout={() => setMobileDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Admin Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileDrawer={() => setMobileDrawerOpen(true)} variant="admin" />
        <main id="main-content" className="epapers-portal-main mx-auto min-h-0 w-full min-w-0 max-w-[1280px] flex-1 p-4 sm:p-6 lg:p-8">
          <div key={location.pathname} className="epapers-page-transition min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
};
