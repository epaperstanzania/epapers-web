'use client';
import { LogOut } from 'lucide-react';
import { useNavigate } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';

export function LogoutButton({ collapsed = false, onLogout }: { collapsed?: boolean; onLogout?: () => void }) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  if (!isAuthenticated) return null;
  return <div className="shrink-0 border-t border-[var(--color-sidebar-border)] p-2">
    <button type="button" aria-label="Log out" title="Log out"
      onClick={() => { logout(); onLogout?.(); navigate('/login', { replace: true }); }}
      className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-hover)] ${collapsed ? 'justify-center' : ''}`}>
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span>Log out</span>}
    </button>
  </div>;
}
