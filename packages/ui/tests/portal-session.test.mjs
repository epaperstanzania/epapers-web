import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startPortalSession, finishPortalSession } from '@epapers/auth/portal-session';
import { portalOrigins } from '@epapers/config/portals';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
function start(returnTo = '/upload') {
  const response = startPortalSession(new Request(portalOrigins.contributor + '/auth/start?returnTo=' + encodeURIComponent(returnTo)), 'contributor');
  return { response, cookie: response.headers.get('set-cookie').split(';')[0], url: new URL(response.headers.get('location')) };
}
test('portal sign-in uses HttpOnly state and only exact canonical callbacks', () => {
  const { response, url } = start('//evil.test');
  assert.equal(url.origin, portalOrigins.web);
  assert.equal(url.searchParams.get('redirectUri'), portalOrigins.contributor + '/auth/callback');
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.equal(url.searchParams.get('challenge').length, 43);
});
test('callback rejects missing and mismatched state without contacting the backend', async () => {
  globalThis.fetch = () => { throw new Error('Must not contact backend'); };
  const { cookie } = start();
  const result = await finishPortalSession(new Request(portalOrigins.contributor + '/auth/callback?state=wrong&code=invalid', { headers: { cookie } }), 'contributor');
  assert.equal(result.status, 400);
});
test('callback exchanges the code server-side and forwards only a host-only refresh cookie', async () => {
  const { cookie, url } = start('/upload');
  globalThis.fetch = async (target, options) => {
    assert.equal(target, portalOrigins.web + '/api/v1/auth/portal-exchange');
    assert.equal(options.headers.Origin, portalOrigins.contributor);
    const body = JSON.parse(options.body);
    assert.equal(body.code, 'one-use-code'); assert.equal(body.verifier.length, 43);
    return new Response('{}', { headers: { 'Set-Cookie': 'epapers_refresh=fixture; Path=/api/v1/auth; HttpOnly; SameSite=Lax' } });
  };
  const result = await finishPortalSession(new Request(portalOrigins.contributor + '/auth/callback?code=one-use-code&state=' + url.searchParams.get('state'), { headers: { cookie } }), 'contributor');
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('location'), portalOrigins.contributor + '/upload');
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(result.headers.getSetCookie().length, 2);
});
