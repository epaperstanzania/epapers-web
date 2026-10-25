'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { AccountSecurity } from '../../components/common/AccountSecurity';
import { PageLoader } from '../../components/common/PageLoader';
import { ChangePasswordForm } from '../../components/common/ChangePasswordForm';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AppNotification } from '../../types';
import { Link } from '@epapers/ui/navigation';
import { DEFAULT_AVATARS, resolveAvatarId, UsernameTile } from '../../components/common/UsernameTile';
import { AccountActivity } from '../../components/common/AccountActivity';

export const NotificationsPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const { currentUser } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true, inFlight = false;
    async function load() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const res = await api.getNotifications(userId!);
        if (active) { setNotifs(res); setLoadError(false); }
      } catch {
        if (active) setLoadError(true);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => { void load(); }, 30000);
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [userId]);

  const handleMarkAllRead = run(async () => {
    if (!userId) return;
    await api.markAllNotificationsRead(userId);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }, () => setLoading(false));
  const handleMarkRead = run(async (id: string) => {
    await api.markNotificationRead(id);
    setNotifs(previous => previous.map(notification => notification.id === id ? { ...notification, read: true } : notification));
  });

  return (<BusyScope busy={busy}><div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
            Notifications
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Alerts and moderation directorate notices.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={loading || !notifs.some(notification => !notification.read)}
          className="text-xs font-semibold text-[var(--color-primary)]  hover:underline cursor-pointer"
        >
          Mark all as read
        </button>
      </div>

      {loadError ? <div role="alert" className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">Notifications could not be loaded. Refresh to try again.</div> : loading ? <PageLoader variant="rows" label="Loading content…" compact /> : notifs.length === 0 ? <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">You have no notifications yet.</div> : <div className="space-y-3">
        {notifs.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
              !n.read
                ? 'bg-[var(--color-blue-tint)]/60  border-[var(--color-accent)]/40'
                : 'bg-[var(--color-surface)]  border-[var(--color-border)] '
            }`}
          >
            <div className="space-y-1">
              <h4 className="font-heading font-bold text-sm text-[var(--color-text)] ">
                {n.title}
              </h4>
              <p className="text-xs text-[var(--color-text-muted)] ">
                {n.message}
              </p>
              <span className="text-[10px] text-[var(--color-neutral)] block pt-0.5">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
            {!n.read && <button type="button" onClick={() => handleMarkRead(n.id)} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">Mark as read</button>}
            {n.link && (
              <Link
                to={n.link}
                className="text-xs font-bold text-[var(--color-primary)]  hover:underline shrink-0"
              >
                View →
              </Link>
            )}
            </div>
          </div>
        ))}
      </div>}
    </div></BusyScope>);
};

export const SettingsPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const { currentUser, updateBioAndAvatar, refreshUser } = useAuth();
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarId, setAvatarId] = useState(currentUser?.avatarId || resolveAvatarId(currentUser?.username || ''));
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setImageError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 6 * 1024 * 1024) {
      setImageError('Choose a JPEG, PNG or WebP image up to 6 MiB.'); return;
    }
    setUploadingImage(true);
    try { const user = await api.uploadProfileImage(file); setAvatarId(user.avatarId || ''); await refreshUser(); }
    catch (error) { setImageError(error instanceof Error ? error.message : 'Profile image upload failed.'); }
    finally { setUploadingImage(false); }
  };

  const handleSave = run(async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBioAndAvatar(bio, avatarId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });

  return (<BusyScope busy={busy}><div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs">
        <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
          Account Settings
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Manage your archivist bio, letter tile accents, and security preferences.
        </p>

        {saved && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--color-success-soft)] text-[var(--color-success)] text-xs font-semibold">
            ✓ Settings updated successfully.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
              Archivist Username
            </label>
            <input
              type="text"
              disabled
              value={currentUser?.username || ''}
              className="w-full bg-[var(--color-sidebar)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text-muted)] font-mono"
            />
            <p className="text-[10px] text-[var(--color-neutral)] mt-1">
              Username changes can be changed after 15 | 30 active days
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
              Bio / Scholar Statement
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1.5">
              Default avatar
            </label>
            <div className="flex items-center gap-2">
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  aria-label={`${avatar.label} avatar`}
                  aria-pressed={avatarId === avatar.id}
                  onClick={() => setAvatarId(avatar.id)}
                  className={`rounded-full transition-transform cursor-pointer ${
                    avatarId === avatar.id ? 'scale-110 ring-2 ring-offset-2 ring-[var(--color-neutral)]' : ''
                  }`}
                >
                  <UsernameTile username={currentUser?.username || 'User'} avatarId={avatar.id} size="md" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-photo" className="block text-xs font-semibold text-[var(--color-text)]">Upload profile photo</label>
            <p className="text-xs text-[var(--color-text-muted)]">JPEG, PNG or WebP, up to 6 MiB. Your photo appears on your profile and contributions.</p>
            <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} onChange={event => { void uploadImage(event.target.files?.[0]); event.target.value = ''; }} className="block w-full text-xs text-[var(--color-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-2 file:font-semibold file:text-[var(--color-input)]" />
            {uploadingImage && <p role="status" className="text-xs">Uploading profile photo…</p>}
            {imageError && <p role="alert" className="text-xs text-[var(--color-danger)]">{imageError}</p>}
            {avatarId.startsWith('p_') && <UsernameTile username={currentUser?.username || 'User'} avatarId={avatarId} size="xl" />}
          </div>

          <button
            type="submit"
            className="py-2.5 px-5 bg-[var(--color-primary)] text-[var(--color-input)] font-bold rounded-xl text-xs hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
          >
            Save Settings
          </button>
        </form>
      </div>
      <ChangePasswordForm />
      <AccountSecurity />
      <AccountActivity />
    </div></BusyScope>);
};
