import { NextResponse } from 'next/server';
import { z } from 'zod';
import { route, preflight } from '@/lib/routes-helpers';
import { username as usernameSchema } from '@epapers/server/modules/auth/schemas';
import { availability } from '@epapers/server/modules/auth/service';
import { fail } from '@epapers/config/errors';
import { encrypt } from '@epapers/server/lib/encryption';

export const runtime = 'nodejs';
export const OPTIONS = preflight;
const GOOGLE_SIGNUP_COOKIE = 'epapers-google-signup';

export const POST = route('auth/google-signup/intent', z.strictObject({ username: usernameSchema }), async ({ username }) => {
  if (!(await availability(username)).available) fail(409, 'USERNAME_TAKEN', 'Username is unavailable');
  const response = NextResponse.json({ data: { ready: true } });
  response.cookies.set(GOOGLE_SIGNUP_COOKIE, encrypt({ username, expiresAt: Date.now() + 600000 }, 'google-signup'), {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/api/v1/auth/callback/google',
    maxAge: 600,
  });
  return response;
}, false);
