import { customPortalAliases, customPortalOrigins, portalOrigins, trustedPortalOrigins, type Portal } from './portals';
export function portalAliasRedirects(portal: Portal) {
  return portalOrigins[portal] === customPortalOrigins[portal]
    ? [{source:'/:path*',has:[{type:'host' as const,value:new URL(customPortalAliases[portal]).host}],destination:customPortalOrigins[portal]+'/:path*',permanent:false}]
    : [];
}
export function portalHeaders(web: boolean) {
  const common = [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}];
  return [
    {source:'/:path*',headers:[...common,{key:'Content-Security-Policy',value:"frame-ancestors 'none'"}]},
    {source:'/auth/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'no-store'}]},
    ...(web ? [{source:'/auth/session-bridge',headers:[...common,{key:'Content-Security-Policy',value:'frame-ancestors '+trustedPortalOrigins.join(' ')},{key:'Cache-Control',value:'no-store'}]}] : []),
  ];
}
