import { createBrowserClient, createServerClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfigured() {
  return Boolean(url && anonKey && !anonKey.startsWith('<'));
}

function credentials() {
  if (!url || !anonKey || !supabaseConfigured()) throw new Error('Google sign-in is not configured');
  return { url, anonKey };
}

export function supabaseBrowserClient() {
  const { url, anonKey } = credentials();
  return createBrowserClient(url, anonKey);
}

export function supabaseCallbackClient(cookies: Parameters<typeof createServerClient>[2]['cookies']) {
  const { url, anonKey } = credentials();
  return createServerClient(url, anonKey, { cookies });
}
