import 'server-only';
import { NextResponse } from 'next/server';
export function json<T>(data: T, status = 200, headers?: HeadersInit) {
    const secured = securityHeaders(new Headers(headers));
    return NextResponse.json(data, { status, headers: secured });
}
export function errorResponse(code: string, message: string, status: number) {
    return NextResponse.json({ error: { code, message } }, { status, headers: securityHeaders(new Headers({ 'Cache-Control': 'no-store' })) });
}
export function securityHeaders(headers = new Headers()): Headers {
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production')
        headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    return headers;
}
