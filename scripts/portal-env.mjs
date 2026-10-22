import { readFileSync } from 'node:fs';
export const portals = JSON.parse(readFileSync(new URL('../deployment/portals.json', import.meta.url), 'utf8'));
export function portalEnvironment(target = 'development') {
  const origins = Object.fromEntries(Object.entries(portals).map(([name, portal]) => [name, target === 'development' ? `http://localhost:${portal.port}` : portal.origin]));
  return {
    NEXT_PUBLIC_AUTH_MODE: 'proxy',
    NEXT_PUBLIC_API_BASE_URL: '/api/v1',
    NEXT_PUBLIC_WEB_ORIGIN: origins.web,
    NEXT_PUBLIC_CONTRIBUTOR_ORIGIN: origins.contributor,
    NEXT_PUBLIC_LECTURER_ORIGIN: origins.lecturer,
    NEXT_PUBLIC_ADMIN_ORIGIN: origins.admin,
    APP_ORIGIN: origins.web,
    API_ORIGIN: origins.web,
    PORTAL_ORIGINS: Object.values(origins).join(','),
    COOKIE_DOMAIN: '',
  };
}
