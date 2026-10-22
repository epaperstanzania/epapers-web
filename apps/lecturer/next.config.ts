import { portalHeaders } from '@epapers/config/next-headers';
import type { NextConfig } from 'next';
import path from 'node:path';
import { portalOrigins } from '@epapers/config/portals';
const config: NextConfig = {output:'standalone',webpack(config){ if(process.platform === 'win32') config.cache = false; return config; },serverExternalPackages:['argon2','@prisma/client'],async headers(){return portalHeaders(false);},outputFileTracingRoot:path.resolve(import.meta.dirname,'../..'),poweredByHeader:false,transpilePackages:['@epapers/ui','@epapers/auth','@epapers/config','@epapers/server','@epapers/database'],experimental:{cpus:2},env:{NEXT_PUBLIC_PORTAL:'lecturer'},async redirects(){return [{source:'/lecturer/papers',destination:'/papers',permanent:false},{source:'/lecturer/bulk-upload',destination:'/bulk-upload',permanent:false}];}};
export default config;
