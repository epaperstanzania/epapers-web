export type Portal = 'web' | 'contributor' | 'lecturer' | 'admin';
const production = process.env.NODE_ENV === 'production';
export const portalAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === 'proxy' ? 'proxy' : 'bridge';
export const portalOrigins = {
  web: process.env.NEXT_PUBLIC_WEB_ORIGIN || (production ? 'https://epapers.co.tz' : 'http://localhost:3000'),
  contributor: process.env.NEXT_PUBLIC_CONTRIBUTOR_ORIGIN || (production ? 'https://contributor.epapers.co.tz' : 'http://localhost:3002'),
  lecturer: process.env.NEXT_PUBLIC_LECTURER_ORIGIN || (production ? 'https://lecturer.epapers.co.tz' : 'http://localhost:3003'),
  admin: process.env.NEXT_PUBLIC_ADMIN_ORIGIN || (production ? 'https://console.epapers.co.tz' : 'http://localhost:3004'),
} satisfies Record<Portal, string>;
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
  else if (/^\/(dashboard|upload|leaderboard|help)(?:[/?#]|$)/.test(path)) owner = current === 'lecturer' && path.startsWith('/dashboard/settings') ? 'lecturer' : 'contributor';
  return owner === current ? target : portalOrigins[owner] + target;
}
export function safeReturnUrl(input: string | null | undefined, fallback = portalOrigins.contributor + '/dashboard'): string {
  if (!input || input.startsWith('//') || input.includes('\\') || [...input].some(character => character.charCodeAt(0) < 32)) return fallback;
  try {
    const url = new URL(input, portalOrigins.web);
    if (url.username || url.password || !Object.values(portalOrigins).includes(url.origin)) return fallback;
    // Never send the user back into an authentication redirect loop.
    if (url.origin === portalOrigins.web && /^\/(login|register|verify|forgot-password|reset-password)(\/|$)/.test(url.pathname)) return fallback;
    return url.href;
  } catch { return fallback; }
}
export function roleHome(role: string) {
  return role === 'admin' ? portalOrigins.admin + '/' : role === 'lecturer' ? portalOrigins.lecturer + '/' : portalOrigins.contributor + '/dashboard';
}
