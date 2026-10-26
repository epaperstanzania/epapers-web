export type Portal = 'web' | 'contributor' | 'lecturer' | 'admin';
const production = process.env.NODE_ENV === 'production';
const vercel = process.env.VERCEL === '1';
export const vercelPortalOrigins = {
  web: 'https://epapertz.vercel.app',
  contributor: 'https://epapertz-contributor.vercel.app',
  lecturer: 'https://epapertz-lecturer.vercel.app',
  admin: 'https://epapertz-admin.vercel.app',
} satisfies Record<Portal, string>;
export const customPortalOrigins = {
  web: 'https://www.epapers.co.tz',
  contributor: 'https://contributor.epapers.co.tz',
  lecturer: 'https://lecturer.epapers.co.tz',
  admin: 'https://console.epapers.co.tz',
} satisfies Record<Portal, string>;
export const customPortalAliases = {
  web: 'https://epapers.co.tz',
  contributor: 'https://www.contributor.epapers.co.tz',
  lecturer: 'https://www.lecturer.epapers.co.tz',
  admin: 'https://www.console.epapers.co.tz',
} satisfies Record<Portal, string>;
export const customWebAlias = customPortalAliases.web;
export const deployedPortalOrigins = process.env.NEXT_PUBLIC_DOMAIN_PROFILE === 'custom' ? customPortalOrigins : vercelPortalOrigins;
export const deployedTrustedOrigins = [
  ...Object.values(deployedPortalOrigins),
  ...(deployedPortalOrigins === customPortalOrigins ? Object.values(customPortalAliases) : []),
];
export const vercelPublicEnv = {
  NEXT_PUBLIC_API_BASE_URL: '/api/v1',
  NEXT_PUBLIC_AUTH_MODE: 'proxy',
  NEXT_PUBLIC_WEB_ORIGIN: deployedPortalOrigins.web,
  NEXT_PUBLIC_CONTRIBUTOR_ORIGIN: deployedPortalOrigins.contributor,
  NEXT_PUBLIC_LECTURER_ORIGIN: deployedPortalOrigins.lecturer,
  NEXT_PUBLIC_ADMIN_ORIGIN: deployedPortalOrigins.admin,
};
export const portalAuthMode = vercel || process.env.NEXT_PUBLIC_AUTH_MODE === 'proxy' ? 'proxy' : 'bridge';
export const portalOrigins = {
  web: vercel ? deployedPortalOrigins.web : process.env.NEXT_PUBLIC_WEB_ORIGIN || (production ? customPortalOrigins.web : 'http://localhost:3000'),
  contributor: vercel ? deployedPortalOrigins.contributor : process.env.NEXT_PUBLIC_CONTRIBUTOR_ORIGIN || (production ? customPortalOrigins.contributor : 'http://localhost:3002'),
  lecturer: vercel ? deployedPortalOrigins.lecturer : process.env.NEXT_PUBLIC_LECTURER_ORIGIN || (production ? customPortalOrigins.lecturer : 'http://localhost:3003'),
  admin: vercel ? deployedPortalOrigins.admin : process.env.NEXT_PUBLIC_ADMIN_ORIGIN || (production ? customPortalOrigins.admin : 'http://localhost:3004'),
} satisfies Record<Portal, string>;
export const trustedPortalOrigins = [
  ...Object.values(portalOrigins),
  ...(portalOrigins.web === customPortalOrigins.web ? Object.values(customPortalAliases) : []),
];
for (const [portal, origin] of Object.entries(portalOrigins)) {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password || (production && url.protocol !== 'https:') || !['https:', 'http:'].includes(url.protocol)) throw new Error(`Invalid public origin for ${portal}`);
}
export function portalDestination(path: string, current: Portal = 'web'): string {
  if (path.startsWith('#') || path.startsWith('?')) return path;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    const url = new URL(path);
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) throw new Error('Unsupported navigation URL');
    return url.href;
  }
  let owner: Portal = 'web', target = path;
  if (/^\/admin(?:[/?#]|$)/.test(path)) { owner = 'admin'; target = path.replace(/^\/admin(?=\/|\?|#|$)/, '') || '/'; if (!target.startsWith('/')) target = '/' + target; }
  else if (/^\/lecturer(?:\/|$)/.test(path)) { owner = 'lecturer'; target = path.replace(/^\/lecturer/, '') || '/'; }
  else if (/^\/(dashboard|upload|leaderboard|help|browse)(?:[/?#]|$)/.test(path)) owner = current === 'lecturer' && path.startsWith('/dashboard/settings') ? 'lecturer' : 'contributor';
  return owner === current ? target : portalOrigins[owner] + target;
}
export function safeReturnUrl(input: string | null | undefined, fallback = portalOrigins.contributor + '/dashboard'): string {
  if (!input || input.startsWith('//') || input.includes('\\') || [...input].some(character => character.charCodeAt(0) < 32)) return fallback;
  try {
    const url = new URL(input, portalOrigins.web);
    if (url.username || url.password || !trustedPortalOrigins.includes(url.origin)) return fallback;
    // Never send the user back into an authentication redirect loop.
    if ((url.origin === portalOrigins.web || url.origin === customWebAlias) && /^\/(login|register|verify|forgot-password|reset-password)(\/|$)/.test(url.pathname)) return fallback;
    return url.href;
  } catch { return fallback; }
}
export function roleHome(role: string) {
  return role === 'admin' ? portalOrigins.admin + '/' : role === 'lecturer' ? portalOrigins.lecturer + '/' : portalOrigins.contributor + '/dashboard';
}
