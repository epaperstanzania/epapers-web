import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('custom-domain www alias', () => {
  it('trusts the exact www origin and keeps auth return URLs out of redirect loops', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('NEXT_PUBLIC_DOMAIN_PROFILE', 'custom');
    vi.resetModules();
    const { customWebAlias, deployedTrustedOrigins, safeReturnUrl } = await import('@epapers/config/portals');
    const { portalHeaders } = await import('@epapers/config/next-headers');

    expect(deployedTrustedOrigins).toContain(customWebAlias);
    expect(safeReturnUrl(customWebAlias + '/papers/123', 'fallback')).toBe(customWebAlias + '/papers/123');
    expect(safeReturnUrl(customWebAlias + '/login', 'fallback')).toBe('fallback');
    expect(safeReturnUrl('https://www.epapers.co.tz.evil.test/papers', 'fallback')).toBe('fallback');
    expect(portalHeaders(true).find(rule => rule.source === '/auth/session-bridge')?.headers
      .find(header => header.key === 'Content-Security-Policy')?.value).toContain(customWebAlias);
  });
});
