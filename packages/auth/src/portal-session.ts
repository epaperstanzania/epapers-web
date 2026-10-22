import { createHash, randomBytes } from 'node:crypto';
import { portalOrigins, type Portal } from '@epapers/config/portals';

type PortalState = { state: string; verifier: string; returnTo: string; expiresAt: number };
const stateCookie = 'epapers_portal_signin';
const responseHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
function localPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(character => character.charCodeAt(0) < 32)) return '/';
  const url = new URL(value, 'https://portal.invalid');
  return url.origin === 'https://portal.invalid' && !url.pathname.startsWith('/auth/') ? url.pathname + url.search : '/';
}
function cookie(value: string, origin: string, maxAge: number) {
  return `${stateCookie}=${value}; Path=/auth; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${origin.startsWith('https:') ? '; Secure' : ''}`;
}
export function startPortalSession(request: Request, portal: Exclude<Portal, 'web'>) {
  const origin = portalOrigins[portal];
  const state: PortalState = { state: randomBytes(32).toString('base64url'), verifier: randomBytes(32).toString('base64url'), returnTo: localPath(new URL(request.url).searchParams.get('returnTo')), expiresAt: Date.now() + 600000 };
  const destination = new URL('/auth/authorize', portalOrigins.web);
  destination.searchParams.set('redirectUri', origin + '/auth/callback');
  destination.searchParams.set('challenge', createHash('sha256').update(state.verifier).digest('base64url'));
  destination.searchParams.set('state', state.state);
  return new Response(null, { status: 303, headers: { ...responseHeaders, Location: destination.href, 'Set-Cookie': cookie(Buffer.from(JSON.stringify(state)).toString('base64url'), origin, 600) } });
}
export async function finishPortalSession(request: Request, portal: Exclude<Portal, 'web'>) {
  const origin = portalOrigins[portal], params = new URL(request.url).searchParams;
  const failure = () => new Response('Sign-in could not be completed. Return to the portal and try again.', { status: 400, headers: { ...responseHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': cookie('', origin, 0) } });
  let state: PortalState;
  try {
    const value = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(stateCookie + '='))?.slice(stateCookie.length + 1);
    state = JSON.parse(Buffer.from(value || '', 'base64url').toString('utf8'));
    if (state.expiresAt <= Date.now() || !state.expiresAt || state.state !== params.get('state') || !/^[A-Za-z0-9_-]{43}$/.test(state.verifier) || !params.get('code')) return failure();
  } catch { return failure(); }
  try {
    const result = await fetch(portalOrigins.web + '/api/v1/auth/portal-exchange', { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'X-EPapers-Client': 'web', Origin: origin }, body: JSON.stringify({ code: params.get('code'), verifier: state.verifier, redirectUri: origin + '/auth/callback' }) });
    const refresh = result.headers.getSetCookie().find(value => value.startsWith('epapers_refresh='));
    // Only host-only authentication cookies can be transferred to this portal.
    if (!result.ok || !refresh || /;\s*domain=/i.test(refresh)) return failure();
    const headers = new Headers({ ...responseHeaders, Location: origin + localPath(state.returnTo) });
    headers.append('Set-Cookie', refresh);
    headers.append('Set-Cookie', cookie('', origin, 0));
    return new Response(null, { status: 303, headers });
  } catch { return failure(); }
}
