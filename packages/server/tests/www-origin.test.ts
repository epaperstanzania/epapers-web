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
    const { customPortalAliases, deployedTrustedOrigins, portalOrigins, safeReturnUrl } = await import('@epapers/config/portals');
    const { portalAliasRedirects, portalHeaders } = await import('@epapers/config/next-headers');

    expect(portalOrigins.web).toBe('https://www.epapers.co.tz');
    for (const [portal, alias] of Object.entries(customPortalAliases)) {
      expect(deployedTrustedOrigins).toContain(alias);
      expect(safeReturnUrl(alias + '/papers/123', 'fallback')).toBe(alias + '/papers/123');
      const redirect = portalAliasRedirects(portal as keyof typeof customPortalAliases)[0];
      expect(redirect?.has[0].value).toBe(new URL(alias).host);
      expect(redirect?.destination).toBe(portalOrigins[portal as keyof typeof customPortalAliases] + '/:path*');
    }
    expect(safeReturnUrl(portalOrigins.web + '/papers/123', 'fallback')).toBe(portalOrigins.web + '/papers/123');
    expect(safeReturnUrl(portalOrigins.web + '/login', 'fallback')).toBe('fallback');
    expect(safeReturnUrl(customPortalAliases.web + '/login', 'fallback')).toBe('fallback');
    expect(safeReturnUrl('https://www.epapers.co.tz.evil.test/papers', 'fallback')).toBe('fallback');
    expect(portalHeaders(true).find(rule => rule.source === '/auth/session-bridge')?.headers
      .find(header => header.key === 'Content-Security-Policy')?.value).toContain(customPortalAliases.admin);
  });
});
