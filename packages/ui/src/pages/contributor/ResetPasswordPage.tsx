'use client';
import { useState } from 'react';
import { Link, useSearchParams } from '@epapers/ui/navigation';
import { ApiForm } from '../../components/common/ApiForm';
import { PasswordInput } from '../../components/common/PasswordInput';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  return <section className="mx-auto my-12 max-w-md space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
    <h1 className="text-xl font-bold">Set a new password</h1>
    {!token ? <p className="text-sm">Open the recovery link from your email. <Link to="/forgot-password" className="underline">Request a new link</Link></p>
      : saved ? <p role="status" className="text-sm">Password updated. <Link to="/login" className="underline">Sign in</Link></p>
      : <ApiForm endpoint="/auth/reset-password" payload={form => ({ token, password: form.get('password') })} onSubmit={() => setSaved(true)} className="space-y-4">
        <PasswordInput label="New password" value={password} onChange={setPassword} newPassword />
        <PasswordInput label="Confirm password" name="confirmPassword" value={confirmation} onChange={setConfirmation} newPassword matchValue={password} />
        <button type="submit" className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white">Update password</button>
      </ApiForm>}
  </section>;
}
