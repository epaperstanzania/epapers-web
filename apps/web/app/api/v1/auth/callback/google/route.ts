import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseCallbackClient } from '@epapers/auth/supabase';
import { loginWithGoogle } from '@epapers/server/modules/auth/service';
import { portalOrigins, roleHome, safeReturnUrl } from '@epapers/config/portals';
import { setSessionCookie } from '@/lib/routes-helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const failure = new URL('/login', portalOrigins.web);
  failure.searchParams.set('notice', 'Google sign-in could not be completed. Please try again.');
  const response = NextResponse.redirect(failure, { status: 303 });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.has('error')) return response;

  try {
    const cookieStore = await cookies();
    const supabase = supabaseCallbackClient({
      getAll: () => cookieStore.getAll(),
      setAll: values => {
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      },
    });
    const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError || !exchanged.session) return response;
    // The user comes from Supabase's server-side PKCE code exchange, not URL parameters or cached cookies.
    const identity = exchanged.user;
    if (!identity?.email || !identity.email_confirmed_at
      || !identity.identities?.some(item => item.provider === 'google')) return response;

    const metadata = identity.user_metadata || {};
    const result = await loginWithGoogle({
      id: identity.id,
      email: identity.email,
      emailVerifiedAt: new Date(identity.email_confirmed_at),
      fullName: typeof metadata.full_name === 'string' ? metadata.full_name : undefined,
      avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined,
    });
    response.headers.set('Location', safeReturnUrl(url.searchParams.get('returnTo'), roleHome(result.user.role)));
    return setSessionCookie(response, result);
  } catch (error) {
    console.error('Google sign-in failed', error);
    return response;
  }
}
