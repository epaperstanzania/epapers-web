'use client';
import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { api } from '../../services/api';
import type { AuditLogItem } from '../../types';

export function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    REGISTER: 'Created an account',
    REGISTER_GOOGLE: 'Created an account with Google',
    LOGIN: 'Signed in',
    LOGIN_GOOGLE: 'Signed in with Google',
    ADMIN_LOGIN: 'Signed in',
    LOGOUT: 'Signed out',
    LOGOUT_ALL: 'Signed out from all devices',
    PASSWORD_RESET: 'Reset password',
    PASSWORD_CHANGED: 'Changed password',
    USERNAME_CHANGED: 'Changed username',
    PROFILE_UPDATED: 'Updated profile',
    PROFILE_IMAGE_UPDATED: 'Updated profile photo',
    PAPER_SUBMITTED: 'Submitted a paper',
    PAPER_DELETED: 'Removed a paper',
    PAPER_PURGED: 'Permanently removed an old paper',
    PAPER_APPROVED: 'Approved a paper',
    PAPER_REJECTED: 'Rejected a paper',
    PAPER_EDITED: 'Edited a paper',
    PAPER_MARKED_SPAM: 'Marked a paper as spam',
    SCAN_REJECTED: 'Paper upload failed security scanning',
    USER_UPDATED: 'Updated a user account',
    SETTINGS_UPDATED: 'Updated system settings',
    LECTURER_APPROVED: 'Approved lecturer verification',
    LECTURER_REJECTED: 'Rejected lecturer verification',
    ANNOUNCEMENT_CREATED: 'Created an announcement',
    ANNOUNCEMENT_UPDATED: 'Updated an announcement',
    ANNOUNCEMENT_DELETED: 'Deleted an announcement',
    DEPARTMENT_CREATED: 'Created a department',
    DEPARTMENT_UPDATED: 'Updated a department',
    PROGRAM_CREATED: 'Created a program',
    PROGRAM_UPDATED: 'Updated a program',
    MODULE_CREATED: 'Created a module',
    MODULE_UPDATED: 'Updated a module',
    MODULES_IMPORTED: 'Imported modules',
    STRUCTURE_DELETED: 'Archived curriculum data',
    MODULE_REQUEST_CREATED: 'Requested a module',
    MODULE_REQUEST_APPROVED: 'Approved a module request',
    MODULE_REQUEST_REJECTED: 'Rejected a module request',
    FLAG_RESOLVED: 'Resolved a paper report',
    FLAG_DISMISSED: 'Dismissed a paper report',
    TAKEDOWN_APPROVED_REMOVED: 'Approved a takedown request',
    TAKEDOWN_REJECTED: 'Rejected a takedown request',
    CONTACT_REVIEWED: 'Reviewed a contact message',
    ACCOUNT_DELETED: 'Deleted an account',
  };
  return labels[action] || action.replaceAll('_', ' ').toLowerCase();
}

export const AccountActivity: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void api.getMyAuditLogPage(undefined, 10).then(page => {
      if (active) {
        setLogs(page.items);
        setNextCursor(page.nextCursor);
      }
    }).catch(() => {
      if (active) setError('Your activity could not be loaded. Please try again later.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await api.getMyAuditLogPage(nextCursor, 10);
      setLogs(previous => [...previous, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError('Older activity could not be loaded. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-2">
        <History aria-hidden="true" className="h-5 w-5 text-[var(--color-accent)]" />
        <h2 className="font-heading text-lg font-bold text-[var(--color-text)]">Your recent activity</h2>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">Only you can see your account activity.</p>
      {error && <p role="alert" className="text-xs text-[var(--color-danger)]">{error}</p>}
      {loading ? <p role="status" className="text-xs text-[var(--color-text-muted)]">Loading activity…</p>
        : logs.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">No account activity recorded yet.</p>
          : <ul className="divide-y divide-[var(--color-border)]">
            {logs.map(log => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <span className="text-sm font-medium text-[var(--color-text)]">{auditActionLabel(log.action)}</span>
                <time className="text-xs text-[var(--color-text-muted)]" dateTime={log.timestamp}>
                  {new Date(log.timestamp).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>}
      {nextCursor && <button type="button" disabled={loadingMore} onClick={() => { void loadMore(); }}
        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50">
        {loadingMore ? 'Loading…' : 'Load older activity'}
      </button>}
    </section>
  );
};
