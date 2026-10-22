'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { portalOrigins } from '@epapers/config/portals';
import { request } from '@epapers/auth/client';
import { useAuth } from '@epapers/ui/context/AuthContext';

export default function AuthorizePortal() {
  const { loading, isAuthenticated } = useAuth();
  const params = useSearchParams(), started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (loading || started.current) return;
    const redirectUri = params.get('redirectUri') || '', challenge = params.get('challenge') || '', state = params.get('state') || '';
    if (![portalOrigins.contributor, portalOrigins.lecturer, portalOrigins.admin].some(origin => redirectUri === origin + '/auth/callback') || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || !/^[A-Za-z0-9_-]{43}$/.test(state)) {
      setError('This sign-in request is invalid. Open your portal and try again.'); return;
    }
    if (!isAuthenticated) { window.location.replace('/login?returnTo=' + encodeURIComponent(window.location.href)); return; }
    started.current = true;
    void request<{ code: string }>('/auth/portal-grants', { method: 'POST', auth: true, body: { redirectUri, challenge } }).then(({ code }) => {
      const destination = new URL(redirectUri);
      destination.searchParams.set('code', code);
      destination.searchParams.set('state', state);
      window.location.replace(destination.href);
    }).catch(() => setError('We could not connect your session. Return to your portal and try again.'));
  }, [loading, isAuthenticated, params]);
  return <main id="main-content" className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-2xl font-bold">Connecting your workspace</h1>{error ? <p role="alert">{error}</p> : <p role="status">Completing your secure sign-in…</p>}<a href={portalOrigins.web} className="inline-block py-3 underline">Return to EPapers</a></main>;
}
