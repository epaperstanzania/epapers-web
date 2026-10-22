import { portalAuthMode, portalOrigins } from '@epapers/config/portals';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: { path: string; message: string }[]) { super(message); }
}
const errorListeners = new Set<(error: ApiError) => void>();
export function subscribeErrors(listener: (error: ApiError) => void) {
  errorListeners.add(listener); return () => { errorListeners.delete(listener); };
}
function report(error: ApiError, endpoint: string) {
  if (endpoint !== '/auth/refresh' && error.status !== 404) errorListeners.forEach(listener => listener(error));
  return error;
}
export function apiTask<Args extends unknown[]>(task: (...args: Args) => Promise<void>, settled?: () => void) {
  return async (...args: Args) => {
    try { await task(...args); }
    catch (error) {
      if (!(error instanceof ApiError)) report(new ApiError(0, 'ACTION_FAILED', error instanceof Error ? error.message : 'The action failed. Please try again.'), 'action');
    } finally { settled?.(); }
  };
}
export const API_BASE_URL = (portalAuthMode === 'proxy' ? '/api/v1' : process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window === 'undefined' ? '/api/v1' : portalOrigins.web + '/api/v1')).replace(/\/+$/, '');
let token: string | null = null;
let role: string | null = null;
let version = 0;
let refreshPromise: Promise<Session | null> | null = null;
export interface Session { accessToken: string; user: { id: string; username: string; role: string; [key: string]: unknown } }
const listeners = new Set<(session: Session | null) => void>();
export function setSession(session: Session | null) {
  version++; token = session?.accessToken || null; role = session?.user.role || null;
  listeners.forEach(listener => listener(session));
}
export const getAccessToken = () => token;
export const getSessionRole = () => role;
export function subscribeSession(listener: (session: Session | null) => void) {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; auth?: boolean; retry?: boolean; reauth?: string };
let pendingRequests = 0;
const pendingWrites = new Map<string, Promise<unknown>>();
const pendingListeners = new Set<(count: number) => void>();
export function subscribePendingRequests(listener: (count: number) => void) {
  pendingListeners.add(listener); listener(pendingRequests);
  return () => { pendingListeners.delete(listener); };
}
export async function request<T>(endpoint: string, options: Options = {}): Promise<T> {
  const key = (options.method || 'GET') !== 'GET' ? JSON.stringify([version, endpoint, options.method, options.body ?? {}, options.auth, options.reauth]) : null;
  if (key && pendingWrites.has(key)) return pendingWrites.get(key) as Promise<T>;
  const operation = (async () => {
    pendingRequests++; pendingListeners.forEach(listener => listener(pendingRequests));
    try { return await performRequest<T>(endpoint, options); }
    finally {
      pendingRequests--; pendingListeners.forEach(listener => listener(pendingRequests));
      if (key) pendingWrites.delete(key);
    }
  })();
  if (key) pendingWrites.set(key, operation);
  return operation;
}
async function performRequest<T>(endpoint: string, options: Options = {}): Promise<T> {
  const method = options.method || 'GET';
  if (options.auth && !token) {
    await restoreSession();
    if (!token) throw report(new ApiError(401, 'UNAUTHORIZED', 'Please sign in to continue.'), endpoint);
  }
  const usedToken = token;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method, credentials: 'include', headers: {
        ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-EPapers-Client': 'web' } : {}),
        ...(options.auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.reauth ? { 'X-EPapers-Reauth': options.reauth } : {}),
      }, body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}), signal: AbortSignal.timeout(20000),
    });
  } catch { throw report(new ApiError(0, 'CONNECTION_FAILED', 'Cannot connect to Epapers. Check the Server address and try again.'), endpoint); }
  const result = await response.json().catch(() => null);
  if (response.status === 401 && options.auth && options.retry !== false && result?.error?.code !== 'REAUTH_REQUIRED') {
    const session = usedToken !== token && token ? { accessToken: token } : await restoreSession();
    if (session) return performRequest<T>(endpoint, { ...options, retry: false });
  }
  if (!response.ok || result?.error) {
    const error = result?.error;
    if (response.status === 401 && options.auth && usedToken === token && error?.code !== 'REAUTH_REQUIRED') setSession(null);
    const fieldMessages = new Map<string, string>((error?.fields ?? []).map((field: { path: string; message: string }) => [field.path, field.message]));
    const details = [...fieldMessages].map(([path, message]) => path === 'password' ? message : `${path}: ${message}`).join('; ');
    throw report(new ApiError(response.status, error?.code || 'HTTP_ERROR', details || error?.message || 'The request failed. Please try again.', error?.fields), endpoint);
  }
  if (!result || !('data' in result)) throw report(new ApiError(response.status, 'INVALID_RESPONSE', 'The Server returned  an unexpected response.'), endpoint);
  return result.data as T;
}
export function restoreSession(): Promise<Session | null> {
  if (refreshPromise) return refreshPromise;
  const previousVersion = version;
  refreshPromise = coordinatedRefresh()
    .then(session => { if (previousVersion !== version) return null; setSession(session); return session; })
    .catch(() => { if (previousVersion === version) setSession(null); return null; })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}
async function coordinatedRefresh(): Promise<Session> {
  if (portalAuthMode !== 'proxy' && typeof window !== 'undefined' && window.location.origin !== portalOrigins.web) return refreshThroughBridge();
  const refresh = () => request<Session>('/auth/refresh', { method: 'POST', retry: false });
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('epapers-refresh', refresh) : refresh();
}
let bridge: Promise<HTMLIFrameElement> | undefined;
function refreshThroughBridge(): Promise<Session> {
  bridge ??= new Promise((resolve, reject) => {
    const frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'EPapers secure session'; frame.src = portalOrigins.web + '/auth/session-bridge';
    const onReady = (event: MessageEvent) => { if(event.origin===portalOrigins.web && event.source===frame.contentWindow && event.data?.type==='epapers:ready'){cleanup();resolve(frame);} };
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('message',onReady); };
    const timer = setTimeout(() => { cleanup(); frame.remove(); bridge = undefined; reject(new Error('Session service timed out')); }, 20000);
    window.addEventListener('message',onReady);
    frame.onerror = () => { cleanup(); frame.remove(); bridge = undefined; reject(new Error('Session service unavailable')); };
    document.body.appendChild(frame);
  });
  return bridge.then(frame => new Promise<Session>((resolve, reject) => {
    const id = crypto.randomUUID();
    const done = () => { clearTimeout(timer); window.removeEventListener('message', onMessage); };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== portalOrigins.web || event.source !== frame.contentWindow || event.data?.id !== id || event.data?.type !== 'epapers:session') return;
      done(); if (event.data.session?.accessToken) resolve(event.data.session); else reject(new Error('Sign in to continue'));
    };
    const timer = setTimeout(() => { done(); reject(new Error('Session service timed out')); }, 20000);
    window.addEventListener('message', onMessage);
    frame.contentWindow?.postMessage({ type: 'epapers:refresh', id }, portalOrigins.web);
  }));
}
export async function listAll<T>(endpoint: string, query: Record<string, unknown> = {}, auth = false): Promise<T[]> {
  const items: T[] = []; const seen = new Set<string>(); let cursor: string | null = null;
  do {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, limit: 100, cursor })) {
      if (value !== undefined && value !== null && value !== '' && value !== 'ALL') params.set(key, String(value));
    }
    const page = await request<{ items: T[]; nextCursor: string | null }>(`${endpoint}?${params}`, { auth });
    items.push(...page.items); cursor = page.nextCursor;
    if (cursor && seen.has(cursor)) throw new ApiError(500, 'INVALID_CURSOR', 'The Server returned  a repeated page cursor.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}
let requestProof: (() => Promise<string>) | null = null;
export function registerReauthentication(handler: () => Promise<string>) {
  requestProof = handler; return () => { requestProof = null; };
}
export async function sensitiveRequest<T>(endpoint: string, options: Options): Promise<T> {
  if (!requestProof) throw new ApiError(401, 'REAUTH_REQUIRED', 'Confirm your administrator credentials to continue.');
  return request<T>(endpoint, { ...options, auth: true, reauth: await requestProof() });
}
