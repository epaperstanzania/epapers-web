'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PasswordInput } from '../../components/common/PasswordInput';
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { EPapersLogo } from '../../components/common/EPapersLogo';
import { ApiForm } from '../../components/common/ApiForm';
import { request } from '../../services/client';
import { KeyRound } from 'lucide-react';

export { LoginPage } from './LoginPage';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Move to 6-box OTP verification
    navigate(`/verify?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <EPapersLogo className="justify-center" />
          <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-text)]  pt-2">
            Create Epapers Profile
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Join DIT peers archiving academic examinations. Usernames cannot be modified after creation.
          </p>
        </div>

        <ApiForm endpoint="/auth/register" payload={(form) => ({ username, email, password, fullName: form.get('fullName') })} onSubmit={handleRegister} className="space-y-4">
          <label className="block text-xs font-semibold text-[var(--color-text)]">
            Full name
            <input name="fullName" required minLength={2} maxLength={160} className="w-full rounded-lg border border-[var(--color-border)] p-2.5" />
          </label>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
              Username (@handle)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g. juma_dit"
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scholar@gmail.com"
              className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
            />
          </div>

          <PasswordInput value={password} onChange={setPassword} newPassword />
          <PasswordInput label="Confirm password" name="confirmPassword" value={confirmation} onChange={setConfirmation} newPassword matchValue={password} />

          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-[var(--color-surface)] font-bold rounded-xl text-xs hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm cursor-pointer"
          >
            Continue to Verification →
          </button>
        </ApiForm>

        <div className="text-center text-xs text-[var(--color-text-muted)]">
          Already registered?{' '}
          <Link to="/login" className="text-[var(--color-primary)]  font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export const VerifyOtpPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') || currentUser?.email || '');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const navigate = useNavigate();

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = run(async (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/login?notice=Email%20verified.%20Sign%20in%20to%20continue.');
  });

  return (<BusyScope busy={busy}><div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-sm space-y-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-blue-tint)]  text-[var(--color-primary)]  flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h1 className="font-heading font-extrabold text-xl text-[var(--color-text)] ">
            Verify Email
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            A 6-digit verification code has been dispatched to{' '}
            <strong className="text-[var(--color-text)] ">{email}</strong>.
          </p>
        </div>

        <ApiForm endpoint="/auth/verify-otp" payload={() => ({ email, code: otp.join('') })} onSubmit={handleVerify} className="space-y-6">
          <label className="block text-left text-xs">Account email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded border p-2.5" /></label>
          {/* 6-box OTP Input */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                required
                pattern="[0-9]"
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digit && idx > 0) {
                    const prevInput = document.getElementById(`otp-${idx - 1}`);
                    prevInput?.focus();
                  }
                }}
                className="w-10 sm:w-12 h-12 sm:h-14 text-center font-heading font-bold text-lg bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-xl text-[var(--color-text)]  focus:outline-hidden focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-[var(--color-surface)] font-bold rounded-xl text-xs hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm cursor-pointer"
          >
            Verify & Activate Profile
          </button>
        </ApiForm>

        <p className="text-xs text-[var(--color-neutral)]">
          Did not receive code?{' '}
          <button
            type="button"
            disabled={resending || !email}
            onClick={async () => {
              setResending(true); setResendMessage('');
              try { await request('/auth/resend-otp', { method: 'POST', body: { email } }); setResendMessage('If the account is eligible, a new code will be sent. Please check your inbox.'); }
              catch (error) { setResendMessage(error instanceof Error ? error.message : 'The code could not be requested.'); }
              finally { setResending(false); }
            }}
            className="text-[var(--color-accent)] font-semibold hover:underline cursor-pointer"
          >
            {resending ? 'Requesting code…' : 'Resend verification code'}
          </button>
        </p>
        {resendMessage && <p role="status" className="text-xs">{resendMessage}</p>}
      </div>
    </div></BusyScope>);
};

export const ForgotPasswordPage: React.FC = () => {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-sm space-y-6 text-center">
        <h1 className="font-heading font-extrabold text-xl text-[var(--color-text)] ">
          Reset Password
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Enter your Epapers @gmail.com email address to receive password recovery instructions.
        </p>

        {sent ? (
          <div className="p-4 bg-[var(--color-success-soft)]  text-[var(--color-success)]  rounded-xl text-xs font-semibold">
            ✓ Password recovery link transmitted. Check your inbox.
          </div>
        ) : (
          <ApiForm endpoint="/auth/forgot-password" payload={(form) => ({ email: form.get('email') })}
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4 text-left"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="user@gmail.com"
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[var(--color-primary)] text-[var(--color-surface)] font-bold rounded-xl text-xs hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm cursor-pointer"
            >
              Send Reset Link
            </button>
          </ApiForm>
        )}

        <div className="text-xs text-[var(--color-text-muted)]">
          <Link to="/login" className="text-[var(--color-primary)]  font-semibold hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
