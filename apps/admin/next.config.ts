import type { NextConfig } from 'next';
import path from 'node:path';
import { portalOrigins } from '@epapers/config/portals';
const config: NextConfig = {output:'standalone',outputFileTracingRoot:path.resolve(import.meta.dirname,'../..'),poweredByHeader:false,transpilePackages:['@epapers/ui','@epapers/auth','@epapers/config','@epapers/server','@epapers/database'],experimental:{cpus:2},env:{NEXT_PUBLIC_PORTAL:'admin'},async redirects(){return [{source:'/admin/:path*',destination:'/:path*',permanent:false},{source:'/security',destination:'/health',permanent:false}];}};
export default config;
