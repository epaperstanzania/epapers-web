'use client';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { EPapersLogo } from '../../components/common/EPapersLogo';
import { PasswordInput } from '../../components/common/PasswordInput';
import { EmailCodeInput } from '../../components/common/EmailCodeInput';
import { GoogleMark } from '../../components/common/GoogleMark';
import { needsEmailVerification, type EmailChallenge } from '../../services/auth';
import { safeReturnUrl, roleHome } from '@epapers/config/portals';
import { supabaseBrowserClient, supabaseConfigured } from '@epapers/auth/supabase';

export function LoginPage() {
  const [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<EmailChallenge | null>(null), [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const [searchParams] = useSearchParams(), location = useLocation(), navigate = useNavigate();
  const { login, verifyAdminLogin, loading, isAuthenticated, role } = useAuth();
  const returnTo = searchParams.get('returnTo');
  useEffect(() => {
    if (!loading && isAuthenticated) navigate(safeReturnUrl(returnTo, roleHome(role)), { replace: true });
  }, [loading, isAuthenticated, role, returnTo, navigate]);
  const notice = searchParams.get('notice') || (location.state as { message?: string } | null)?.message;
  const startLogin = async () => {
    if (pending) return;
    setPending(true); setError('');
    try {
      const result = await login(username, password);
      if (needsEmailVerification(result)) { setChallenge(result); setCode(''); }
      else { setPassword(''); navigate(safeReturnUrl(searchParams.get('returnTo'), roleHome(result.user.role))); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.'); }
    finally { setPending(false); }
  };
  const startGoogleLogin = async () => {
    if (pending) return;
    setPending(true); setError('');
    try {
      const callback = new URL('/api/v1/auth/callback/google', window.location.origin);
      if (returnTo) callback.searchParams.set('returnTo', safeReturnUrl(returnTo));
      const { error: oauthError } = await supabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.href },
      });
      if (oauthError) throw oauthError;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.');
      setPending(false);
    }
  };
  const verify = async () => {
    if (!challenge || pending) return;
    setPending(true); setError('');
    try { await verifyAdminLogin(challenge.challengeToken, code, rememberDevice); setPassword(''); setCode(''); setChallenge(null); navigate(safeReturnUrl(returnTo, roleHome('admin'))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Verification failed.'); }
    finally { setPending(false); }
  };
  if (loading || isAuthenticated) return <div role="status" className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--color-text-muted)]">Opening your workspace…</div>;
  return <div className="relative isolate flex min-h-[85vh] items-center justify-center overflow-hidden rounded-2xl p-4">
    <div aria-hidden="true" className="absolute inset-0 -z-10 scale-105 bg-cover bg-center blur-sm" style={{ backgroundImage: "url('/images/A-balck-book.jpg')" }} />
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-950/45" />
    <div className="w-full max-w-md space-y-6 rounded-xl border border-white/70 bg-[var(--color-surface)]/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
      <div className="space-y-2 text-center"><EPapersLogo className="justify-center" />
        <h1 className="pt-2 font-heading text-2xl font-extrabold">{challenge ? 'Verify your sign-in' : 'Sign in to Epapers'}</h1>
        <p className="text-xs text-[var(--color-text-muted)]">{challenge ? 'An email code is required to access your administrator account.' : 'Sign in with your username or email and password, or continue with Google.'}</p>
      </div>
      {notice && <p role="status" className="rounded-lg bg-[var(--color-warning-soft)] p-3 text-xs">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
      <form onSubmit={event => { event.preventDefault(); void (challenge ? verify() : startLogin()); }} className="space-y-4" aria-busy={pending}>
        <fieldset disabled={pending} className="space-y-4">
          {challenge ? <>
            <EmailCodeInput value={code} onChange={setCode} resendAfter={challenge.resendAfter} onResend={() => void startLogin()} busy={pending} />
            <label className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-text)]">
              <input type="checkbox" checked={rememberDevice} onChange={event => setRememberDevice(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
              <span><strong className="block">Remember this device for 7 days</strong><span className="mt-1 block text-[var(--color-text-muted)]">You will stay signed in here. Signing out will require a new code.</span></span>
            </label>
          </> : <>
            <label className="block text-xs font-semibold">Username or email
              <input type="text" name="username" required minLength={3} maxLength={254} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5 text-sm" />
            </label>
            <PasswordInput value={password} onChange={setPassword} />
            <Link to="/forgot-password" className="inline-block text-xs text-[var(--color-primary)] hover:underline">Forgot password?</Link>
          </>}
          <button type="submit" className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-white disabled:opacity-60">{pending ? 'Please wait…' : challenge ? 'Verify code & sign in' : 'Sign in'}</button>
          {challenge && <button type="button" className="w-full text-xs text-[var(--color-text-muted)]" onClick={() => { setChallenge(null); setCode(''); setPassword(''); setError(''); }}>Back to sign in</button>}
        </fieldset>
      </form>
      {!challenge && supabaseConfigured() && <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]"><span className="h-px flex-1 bg-[var(--color-border)]" />or<span className="h-px flex-1 bg-[var(--color-border)]" /></div>
        <button type="button" disabled={pending} onClick={() => void startGoogleLogin()}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-60">
          <GoogleMark className="h-5 w-5 shrink-0" />
Continue with Google
        </button>
      </div>}
      <p className="text-center text-xs text-[var(--color-text-muted)]">New to Epapers? <Link to="/register" className="font-semibold text-[var(--color-primary)] hover:underline">Create an account</Link></p>
    </div>
  </div>;
}
