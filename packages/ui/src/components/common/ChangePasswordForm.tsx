'use client';
import { useState } from 'react';
import { useNavigate } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { request, setSession } from '../../services/client';
import { PasswordInput } from './PasswordInput';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const { setFlashMessage } = useAuth();
  const navigate = useNavigate();
  return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
    <h2 className="text-lg font-bold text-[var(--color-text)]">Change password</h2>
    <p className="mt-1 text-xs text-[var(--color-text-muted)]">After changing your password, you will be signed out on all devices. Sign in again with your new password.</p>
    <form className="mt-5 space-y-4" onSubmit={async event => {
      event.preventDefault();
      if (busy || password !== confirmation) return;
      setBusy(true);
      try {
        const result = await request<{ message: string }>('/auth/change-password', { method: 'POST', auth: true, retry: false, body: { currentPassword, password } });
        setCurrentPassword(''); setPassword(''); setConfirmation('');
        setFlashMessage(result.message);
        setSession(null);
        navigate('/login', { replace: true, state: { message: result.message } });
      } catch { /* The API client displays the error toast. */ }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} className="space-y-4">
        <PasswordInput label="Current password" name="currentPassword" value={currentPassword} onChange={setCurrentPassword} />
        <PasswordInput label="New password" value={password} onChange={setPassword} newPassword />
        <PasswordInput label="Confirm new password" name="confirmPassword" value={confirmation} onChange={setConfirmation} newPassword matchValue={password} />
        <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-[var(--color-input)] disabled:opacity-60">{busy ? 'Changing password…' : 'Change password'}</button>
      </fieldset>
    </form>
  </section>;
}
