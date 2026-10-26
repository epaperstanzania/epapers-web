import { portalHeaders } from '@epapers/config/next-headers';
import type { NextConfig } from 'next';
import path from 'node:path';
import { customPortalOrigins, customWebAlias, portalOrigins, vercelPublicEnv } from '@epapers/config/portals';
const config: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  webpack(config) {
    if (process.platform === 'win32') config.cache = false;
    return config;
  },
  serverExternalPackages: ['argon2', '@prisma/client'],
  async headers() { return portalHeaders(true); },
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
  outputFileTracingExcludes: { '/*': ['../../.cache/**/*', '../../.git/**/*'] },
  poweredByHeader: false,
  transpilePackages: ['@epapers/ui', '@epapers/auth', '@epapers/config', '@epapers/server', '@epapers/database'],
  experimental: { cpus: 2 },
  env: { NEXT_PUBLIC_PORTAL: 'web', ...(process.env.VERCEL === '1' ? vercelPublicEnv : {}) },
  async redirects() { return [
    // Keep OAuth PKCE and the host-only login cookie on the canonical web host.
    ...(portalOrigins.web === customPortalOrigins.web ? [{source:'/:path*',has:[{type:'host' as const,value:new URL(customWebAlias).host}],destination:customPortalOrigins.web+'/:path*',permanent:false}] : []),
    {source:'/dashboard/:path*',destination:portalOrigins.contributor+'/dashboard/:path*',permanent:false},{source:'/upload',destination:portalOrigins.contributor+'/upload',permanent:false},{source:'/admin/:path*',destination:portalOrigins.admin+'/:path*',permanent:false},{source:'/lecturer/papers',destination:portalOrigins.lecturer+'/papers',permanent:false},{source:'/lecturer/bulk-upload',destination:portalOrigins.lecturer+'/bulk-upload',permanent:false},{source:'/leaderboard',destination:portalOrigins.contributor+'/leaderboard',permanent:false},{source:'/help',destination:portalOrigins.contributor+'/help',permanent:false}
  ]; },
};
export default config;
