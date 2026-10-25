import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseCallbackClient } from '@epapers/auth/supabase';
import { loginWithGoogle } from '@epapers/server/modules/auth/service';
import { portalOrigins, roleHome, safeReturnUrl } from '@epapers/config/portals';
import { setSessionCookie } from '@/lib/routes-helpers';
import { decrypt } from '@epapers/server/lib/encryption';
import { username as usernameSchema } from '@epapers/server/modules/auth/schemas';
import { ApiError } from '@epapers/config/errors';

export const runtime = 'nodejs';
const signupCookieName = 'epapers-google-signup';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const signupCookie = request.cookies.get(signupCookieName)?.value;
  const failure = new URL(signupCookie ? '/register' : '/login', portalOrigins.web);
  failure.searchParams.set('notice', 'Google sign-in could not be completed. Please try again.');
  const response = NextResponse.redirect(failure, { status: 303 });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  if (signupCookie) response.cookies.set(signupCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/api/v1/auth/callback/google',
    maxAge: 0,
  });
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.has('error')) return response;

  try {
    let chosenUsername: string | undefined;
    if (signupCookie) {
      const intent = decrypt<{ username: string; expiresAt: number }>(signupCookie, 'google-signup');
      const parsed = usernameSchema.safeParse(intent.username);
      if (!parsed.success || !Number.isFinite(intent.expiresAt) || intent.expiresAt < Date.now()) return response;
      chosenUsername = parsed.data;
    }
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
      username: chosenUsername,
    });
    response.headers.set('Location', safeReturnUrl(url.searchParams.get('returnTo'), roleHome(result.user.role)));
    return setSessionCookie(response, result);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'USERNAME_TAKEN') {
      failure.searchParams.set('notice', 'That username is unavailable. Choose another and try again.');
      response.headers.set('Location', failure.href);
      return response;
    }
    console.error('Google sign-in failed', error);
    return response;
  }
}
