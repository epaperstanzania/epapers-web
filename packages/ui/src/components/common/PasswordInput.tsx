'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { passwordError } from '../../services/password-policy';

export const PASSWORD_HINT = 'At least 6 characters with a letter and a number. Uppercase letters and symbols are encouraged but optional.';

export function PasswordInput({ label = 'Password', name = 'password', value, onChange, newPassword = false, matchValue }: {
  label?: string; name?: string; value: string; onChange: (value: string) => void;
  newPassword?: boolean; matchValue?: string;
}) {
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const getError = (password: string) => (newPassword ? passwordError(password) : password ? null : 'Enter your password.') || (matchValue !== undefined && password !== matchValue ? 'Passwords must match.' : null);
  const validationError = getError(value);
  const showError = !!validationError && touched;
  useEffect(() => { input.current?.setCustomValidity(validationError || ''); }, [validationError]);
  return <div className="space-y-1.5">
    <label htmlFor={id} className="block text-xs font-semibold text-[var(--color-text)]">{label}</label>
    <div className="relative">
      <input ref={input} id={id} name={name} type={visible ? 'text' : 'password'} required
        autoComplete={newPassword ? 'new-password' : 'current-password'}
        minLength={newPassword ? 6 : 1} maxLength={128}
        pattern={newPassword ? '(?=.*[a-zA-Z])(?=.*[0-9]).{6,128}' : undefined}
        title={newPassword ? PASSWORD_HINT : undefined} value={value}
        onChange={event => { event.currentTarget.setCustomValidity(getError(event.target.value) || ''); onChange(event.target.value); }}
        onBlur={() => setTouched(true)} onInvalid={() => setTouched(true)}
        aria-describedby={newPassword || showError ? `${id}-hint` : undefined} aria-invalid={showError || undefined}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5 pr-16 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
      <button type="button" aria-controls={id} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible}
        onClick={() => setVisible(previous => !previous)} className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-[var(--color-primary)]">
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
    {(newPassword || showError) && <p id={`${id}-hint`} role={showError ? 'alert' : undefined} className={`text-xs ${showError ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>{showError ? validationError : PASSWORD_HINT}</p>}
  </div>;
}
