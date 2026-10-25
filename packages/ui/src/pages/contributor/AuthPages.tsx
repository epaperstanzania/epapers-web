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
import { EmailCodeInput } from '../../components/common/EmailCodeInput';
import { GoogleMark } from '../../components/common/GoogleMark';
import { supabaseBrowserClient, supabaseConfigured } from '@epapers/auth/supabase';

export { LoginPage } from './LoginPage';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [googleUsername, setGoogleUsername] = useState('');
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Move to 6-box OTP verification
    navigate(`/verify?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
  };

  const startGoogleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (googlePending) return;
    const chosen = googleUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(chosen)) {
      setGoogleError('Use 3–30 letters, numbers, or underscores for your username.');
      return;
    }
    setGooglePending(true);
    setGoogleError('');
    try {
      await request('/auth/google-signup/intent', { method: 'POST', body: { username: chosen }, retry: false });
      const callback = new URL('/api/v1/auth/callback/google', window.location.origin);
      const { error } = await supabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.href },
      });
      if (error) throw error;
    } catch (reason) {
      setGoogleError(reason instanceof Error ? reason.message : 'Google sign-up failed. Please try again.');
      setGooglePending(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-[85vh] items-center justify-center overflow-hidden rounded-2xl p-4">
      <div aria-hidden="true" className="absolute inset-0 -z-10 scale-105 bg-cover bg-center blur-sm" style={{ backgroundImage: "url('/images/A-balck-book.jpg')" }} />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-950/45" />
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/70 bg-[var(--color-surface)]/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="text-center space-y-2">
          <EPapersLogo className="justify-center" />
          <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-text)]  pt-2">
            Create Epapers Profile
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Join DIT peers archiving academic examinations. Usernames cannot be modified after creation.
          </p>
        </div>

        {searchParams.get('notice') && <p role="status" className="rounded-lg bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-text)]">{searchParams.get('notice')}</p>}

        {supabaseConfigured() && <div className="space-y-4">
          <form onSubmit={event => void startGoogleSignup(event)} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
            <label htmlFor="google-signup-username" className="block text-xs font-semibold text-[var(--color-text)]">Choose your username</label>
            <input id="google-signup-username" type="text" required minLength={3} maxLength={30} autoComplete="username" autoCapitalize="none" spellCheck={false}
              value={googleUsername} onChange={event => setGoogleUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g. juma_dit" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm text-[var(--color-text)]" />
            <p className="text-xs text-[var(--color-text-muted)]">Your name and verified email will come from Google. No password needed.</p>
            {googleError && <p role="alert" className="text-xs text-[var(--color-danger)]">{googleError}</p>}
            <button type="submit" disabled={googlePending} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60">
              <GoogleMark className="h-6 w-6 shrink-0" />{googlePending ? 'Connecting to Google…' : 'Sign up with Google'}
            </button>
          </form>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]"><span className="h-px flex-1 bg-[var(--color-border)]" />or sign up with email<span className="h-px flex-1 bg-[var(--color-border)]" /></div>
        </div>}

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
            Continue →
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

  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

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

        <ApiForm endpoint="/auth/verify-otp" payload={() => ({ email, code: otp })} onSubmit={handleVerify} className="space-y-6">
          <label className="block text-left text-xs">Account email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded border p-2.5" /></label>
          <EmailCodeInput value={otp} onChange={setOtp} resendAfter="" onResend={() => {}} busy={busy} showResend={false} />

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
