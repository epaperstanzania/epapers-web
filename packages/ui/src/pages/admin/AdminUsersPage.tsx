'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { UserProfile, Role } from '../../types';
import { UsernameTile } from '../../components/common/UsernameTile';
import { LevelBadge } from '../../components/common/LevelBadge';
import { MobileFilterDrawer } from '../../components/common/MobileFilterDrawer';

export const AdminUsersPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Modals for actions
  const [actionType, setActionType] = useState<
    'suspend' | 'ban' | 'reinstate' | 'change_role' | 'adjust_xp' | 'verify_lecturer' | null
  >(null);
  const [actionReason, setActionReason] = useState('');
  const [newRole, setNewRole] = useState<Role>('contributor');
  const [xpAdjustment, setXpAdjustment] = useState<number>(50);

  const loadUsers = apiTask(async () => {
    const list = await api.getAllUsers();
    setUsers(list);
  }, () => setLoading(false));

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleExecuteAction = run(async () => {
    if (!selectedUser || !actionType) return;
    await api.manageUser(
      selectedUser.id,
      actionType,
      actionReason || 'Administrative regulation review',
      {
        newRole,
        xpAdjustment: Math.max(0, Number(xpAdjustment)),
      }
    );
    setActionType(null);
    setSelectedUser(null);
    setActionReason('');
    loadUsers();
  });

  if (loading) return <PageLoader variant="rows" />;
  return (<BusyScope busy={busy}><div className="space-y-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl text-[var(--color-text)]">
            User & Archivist Directory
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Manage contributors, verified faculty credentials, security status, and XP records.
          </p>
        </div>

        <input
          aria-label="Search users by username or email"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by username or email..."
          className="hidden lg:block bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] w-64 focus:outline-hidden focus:border-[var(--color-primary)]"
        />
        <MobileFilterDrawer title="Search users" summary={search || `${filtered.length} users`}>
          {(close) => <div className="epapers-mobile-filter-fields">
            <label>Username or email
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a contributor or admin" />
            </label>
            <div className="epapers-mobile-filter-actions">
              <button type="button" onClick={() => setSearch('')}>Clear</button>
              <button type="button" onClick={close}>Show {filtered.length} results</button>
            </div>
          </div>}
        </MobileFilterDrawer>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="epapers-responsive-table w-full text-left text-xs">
            <thead className="bg-[var(--color-sidebar)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Archivist</th>
                <th className="p-3.5">Role & Status</th>
                <th className="p-3.5">Level & Tier</th>
                <th className="p-3.5">Submissions</th>
                <th className="p-3.5">Current XP</th>
                <th className="p-3.5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--color-canvas)] transition-colors">
                  <td data-label="Archivist" className="p-3.5">
                    <div className="flex items-center gap-3">
                      <UsernameTile
                        username={u.username}
                        size="md"
                        avatarId={u.avatarId}
                      />
                      <div>
                        <span className="font-bold text-sm text-[var(--color-text)] block">
                          @{u.username}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-mono">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  <td data-label="Role & status" className="p-3.5">
                    <div className="space-y-0.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--color-sidebar)] text-[var(--color-primary)]">
                        {u.role}
                      </span>
                      {u.isLecturerVerified && (
                        <span className="block text-[10px] font-semibold text-[var(--color-success)]">
                          Verified Faculty
                        </span>
                      )}
                      {u.status !== 'active' && (
                        <span className="block text-[10px] font-bold text-[var(--color-danger)] uppercase">
                          {u.status}
                        </span>
                      )}
                    </div>
                  </td>

                  <td data-label="Tier" className="p-3.5">
                    <LevelBadge level={u.level} title={u.levelTitle} size="sm" />
                  </td>

                  <td data-label="Submissions" className="p-3.5 font-mono text-[var(--color-text)]">
                    {u.approvedCount} / {u.submissionsCount} ({u.acceptanceRate}%)
                  </td>

                  <td data-label="Current XP" className="p-3.5 font-mono font-bold text-[var(--color-primary)]">
                    {u.xp} XP
                  </td>

                  <td data-label="Actions" className="p-3.5 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setActionType('adjust_xp');
                        setXpAdjustment(50);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--color-active)] text-[var(--color-primary)] text-[11px] font-semibold hover:bg-[var(--color-active-hover)] cursor-pointer"
                    >
                      Grant XP
                    </button>

                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setActionType('change_role');
                        setNewRole(u.role);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--color-input-border)] text-[var(--color-text)] text-[11px] font-semibold hover:bg-[var(--color-sidebar)] cursor-pointer"
                    >
                      Role
                    </button>

                    {u.status === 'active' ? (
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setActionType('suspend');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-[11px] font-semibold hover:bg-[var(--color-danger-soft-hover)] cursor-pointer"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setActionType('reinstate');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-success-soft)] text-[var(--color-success)] text-[11px] font-semibold hover:bg-[var(--color-success-soft)] cursor-pointer"
                      >
                        Reinstate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-text)]/40">
          <div role="dialog" aria-modal="true" aria-labelledby="user-action-title" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full space-y-4 shadow-sm">
            <div>
              <h3 id="user-action-title" className="font-bold text-base text-[var(--color-text)] capitalize">
                {actionType === 'adjust_xp' ? 'Grant Additional XP' : actionType.replace('_', ' ')} for @{selectedUser.username}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Epapers action requiring audit documentation.
              </p>
            </div>

            {actionType === 'adjust_xp' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text)] block">
                  Additional XP to Grant (Admins may only add XP or leave unchanged — no negative deductions)
                </label>
                <input
                  type="number"
                  min="0"
                  value={xpAdjustment}
                  onChange={(e) => setXpAdjustment(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2.5 text-xs font-mono font-bold text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            {actionType === 'change_role' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text)] block">
                  Select New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-primary)]"
                >
                  <option value="contributor">Contributor</option>
                  <option value="lecturer">Lecturer (Faculty)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] block mb-1">
                Required Audit Reason
              </label>
              <textarea
                rows={3}
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="State the Epapers justification..."
                className="w-full bg-[var(--color-input)] border border-[var(--color-input-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-hidden focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar)] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!actionReason.trim()}
                onClick={handleExecuteAction}
                className="px-4 py-1.5 bg-[var(--color-primary)] text-[var(--color-input)] font-semibold text-xs rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div></BusyScope>);
};
