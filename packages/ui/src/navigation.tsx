'use client';
import React, { useCallback, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter, useParams as nextParams, useSearchParams as nextSearchParams } from 'next/navigation';
import { portalAuthMode, portalDestination, portalOrigins, type Portal } from '@epapers/config/portals';
const current = (process.env.NEXT_PUBLIC_PORTAL || 'web') as Portal;
type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; state?: { message?: string }; replace?: boolean };
export function Link({ to, state: _state, replace, ...props }: LinkProps) {
  const href = portalDestination(to, current);
  return href.startsWith('/') || href.startsWith('#') || href.startsWith('?') ? <NextLink href={href} replace={replace} {...props} /> : <a href={href} {...props} />;
}
type NavState = { isActive: boolean; isPending: boolean };
export function NavLink({ className, children, end, ...props }: Omit<LinkProps, 'className' | 'children'> & { end?: boolean; className?: string | ((state: NavState) => string); children?: React.ReactNode | ((state: NavState) => React.ReactNode) }) {
  const pathname = usePathname(), href = portalDestination(props.to, current);
  const target = new URL(href, portalOrigins[current]);
  const local = target.origin === portalOrigins[current];
  const state = { isActive: local && (pathname === target.pathname || (!end && target.pathname !== '/' && pathname.startsWith(target.pathname + '/'))), isPending: false };
  return <Link {...props} aria-current={state.isActive ? 'page' : undefined} className={typeof className === 'function' ? className(state) : className}>{typeof children === 'function' ? children(state) : children}</Link>;
}
export function useNavigate() {
  const router = useRouter();
  return useCallback((to: string | number, options?: { replace?: boolean; state?: { message?: string } }) => {
    if (typeof to === 'number') { if (to < 0) router.back(); else router.forward(); return; }
    let href = portalDestination(to, current);
    if (options?.state?.message) { const url = new URL(href, portalOrigins[current]); url.searchParams.set('notice', options.state.message); href = url.href; }
    if (href.startsWith('/')) { if (options?.replace) router.replace(href); else router.push(href); }
    else { if (options?.replace) window.location.replace(href); else window.location.assign(href); }
  }, [router]);
}
export function Navigate({ to, replace, state }: { to: string; replace?: boolean; state?: { message?: string } }) {
  const navigate = useNavigate(), pathname = usePathname(), search = nextSearchParams();
  useEffect(() => {
    let destination = to;
    if (to === '/login' && portalAuthMode === 'proxy' && current !== 'web') {
      window.location.replace('/auth/start?returnTo=' + encodeURIComponent(pathname + (search.size ? '?' + search : '')));
      return;
    }
    if (to === '/login') { const url = new URL('/login', portalOrigins.web); url.searchParams.set('returnTo', new URL(pathname + (search.size ? '?' + search : ''), portalOrigins[current]).href); destination = url.href; }
    navigate(destination, { replace, state });
  }, [to, replace, state?.message, navigate, pathname, search]);
  return <p role="status" className="p-6">Redirecting…</p>;
}
export function useLocation() {
  const pathname = usePathname(), params = nextSearchParams();
  // Legacy shell titles use /admin paths; navigation itself always uses Next's actual path.
  return { pathname: current === 'admin' ? '/admin' + (pathname === '/' ? '' : pathname) : pathname, search: params.size ? '?' + params : '', state: { message: params.get('notice') || undefined } };
}
export function useParams<T extends Record<string, string>>() { return nextParams<T>(); }
export function useSearchParams(): [URLSearchParams, (value: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => void] {
  const params = nextSearchParams(), pathname = usePathname(), router = useRouter();
  return [new URLSearchParams(params.toString()), (value, options) => { const href = pathname + '?' + new URLSearchParams(value); if (options?.replace) router.replace(href); else router.push(href); }];
}
