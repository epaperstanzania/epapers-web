import { portalHeaders } from '@epapers/config/next-headers';
import type { NextConfig } from 'next';
import path from 'node:path';
import { portalAuthMode, portalOrigins } from '@epapers/config/portals';
const config: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  webpack(config) {
    if (process.platform === 'win32') config.cache = false;
    return config;
  },
  serverExternalPackages: ['argon2', '@prisma/client'],
  async headers() { return portalHeaders(false); },
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
  outputFileTracingExcludes: { '/*': ['../../.cache/**/*', '../../.git/**/*'] },
  poweredByHeader: false,
  transpilePackages: ['@epapers/ui', '@epapers/auth', '@epapers/config', '@epapers/server', '@epapers/database'],
  experimental: { cpus: 2 },
  env: { NEXT_PUBLIC_PORTAL: 'contributor' },
  async rewrites() {
    return portalAuthMode === 'proxy' ? [{ source: '/api/v1/:path*', destination: portalOrigins.web + '/api/v1/:path*' }] : [];
  },
  async redirects() { return []; },
};
export default config;
