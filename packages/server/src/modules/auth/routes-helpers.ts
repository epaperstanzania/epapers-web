import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@epapers/config/server-env';
import { ApiError, fail } from '@epapers/config/errors';
import { securityHeaders } from '@epapers/server/lib/http';
import { verifyReauthentication } from '@epapers/auth/jwt';
import { logger } from '@epapers/server/lib/logger';
import { rateLimit } from '@epapers/server/lib/rate-limit';
import { ipHash } from '@epapers/auth/crypto';
import { authenticate, authorize } from '@epapers/server/modules/auth/service';
import { enforceWritePolicy } from '@epapers/server/lib/write-policy';
import { trustedOrigin, validMutation, refreshCookieOptions } from '@epapers/auth/policy';
type Identity = Awaited<ReturnType<typeof authenticate>>;
export function withAuth(options: {
    roles?: string[];
    requireVerifiedEmail?: boolean;
    scope?: {
        departmentId: string;
    };
    requireReauth?: boolean;
} = {}) {
    return async (req: NextRequest): Promise<Identity> => {
        const bearer = req.headers.get('authorization');
        if (!bearer?.startsWith('Bearer '))
            fail(401, 'UNAUTHORIZED', 'Authentication required');
        const identity = await authenticate(bearer.slice(7));
        authorize(identity.user, options);
        if (options.requireReauth) {
            try {
                const claims = await verifyReauthentication(req.headers.get('x-epapers-reauth') || '');
                if (identity.user.role !== 'ADMIN' || claims.sub !== identity.user.id || claims.sid !== identity.session.id || claims.purpose !== 'reauth')
                    fail(401, 'REAUTH_REQUIRED', 'Reauthentication required');
            }
            catch {
                fail(401, 'REAUTH_REQUIRED', 'Reauthentication required');
            }
        }
        return identity;
    };
}
export function cors(req: NextRequest, response: NextResponse, publicCache = false) {
    securityHeaders(response.headers);
    response.headers.set('Cache-Control', publicCache && response.ok ? 'public, max-age=60, s-maxage=300' : 'no-store');
    response.headers.set('Vary', 'Origin');
    const origin = req.headers.get('origin');
    if (trustedOrigin(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
}
export function preflight(req: NextRequest) {
    const response = cors(req, new NextResponse(null, { status: trustedOrigin(req.headers.get('origin')) ? 204 : 403 }));
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-EPapers-Client,X-EPapers-Reauth');
    return response;
}
export function route<T>(name: string, schema: z.ZodType<T>, action: (data: T, req: NextRequest, identity?: Identity) => Promise<unknown>, auth: boolean | 'optional' | {roles:string[];requireReauth?:boolean} = false, publicCache = false) {
    return async (req: NextRequest) => {
        const started = Date.now();
        const requestId = crypto.randomUUID();
        let response: NextResponse;
        try {
            if (req.method !== 'GET' && !validMutation(req.headers.get('origin'), req.headers.get('x-epapers-client')))
                fail(403, 'CSRF_FAILED', 'Invalid client origin');
            // Trust only the header overwritten by Cloudflare; restrict VPS ingress to Cloudflare in production.
            await rateLimit('ip:' + name + ':' + ipHash(env.TRUST_PROXY ? req.headers.get('cf-connecting-ip') || 'unknown' : 'local'), name === 'login' ? 20 : 60, 900);
            const identity = typeof auth === 'object' ? await withAuth(auth)(req) : auth === true || (auth === 'optional' && req.headers.has('authorization')) ? await withAuth()(req) : undefined;
            if (identity && req.method !== 'GET') await rateLimit('account:' + name + ':' + identity.user.id, 60, 900);
            let raw: unknown;
            if (req.method === 'GET') {
                const params=new URL(req.url).searchParams;
                if(new Set(params.keys()).size !== [...params.keys()].length)fail(422,'DUPLICATE_QUERY','Repeated query parameters are not allowed');
                raw = Object.fromEntries(params);
            }
            else {
                const reader = req.body?.getReader();
                let size = 0;
                const chunks: Uint8Array[] = [];
                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        size += value.byteLength;
                        if (size > 16384) {
                            await reader.cancel();
                            fail(413, 'BODY_TOO_LARGE', 'Request body is too large');
                        }
                        chunks.push(value);
                    }
                }
                try {
                    raw = size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
                }
                catch {
                    fail(422, 'INVALID_JSON', 'Invalid JSON');
                }
            }
            const data = schema.parse(raw);
            await enforceWritePolicy(name,req.method);
            const result = await action(data, req, identity);
            response = result instanceof NextResponse ? result : NextResponse.json({ data: result });
        }
        catch (error) {
            const code = (error as {
                code?: string;
            }).code;
            if (error instanceof z.ZodError)
                response = NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: error.issues.map(i => ({ path: i.path.join('@epapers/server/modules/auth'), message: i.message })) } }, { status: 422 });
            else if (error instanceof ApiError)
                response = NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
            else if (code === 'P2002' || code === '23505')
                response = NextResponse.json({ error: { code: 'CONFLICT', message: 'Value is already in use' } }, { status: 409 });
            else {
                logger.error({ err: error, requestId }, 'Request failed');
                response = NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Service is temporarily unavailable' } }, { status: 500 });
            }
        }
        logger.info({ requestId, method: req.method, route: name, status: response.status, duration: Date.now() - started }, 'Request completed');
        response.headers.set('X-Request-ID', requestId);
        return cors(req, response, publicCache && req.method === 'GET' && !auth);
    };
}
export function sessionResponse(result: {
    accessToken: string;
    refreshToken: string;
    user: unknown;
    session: {
        expiresAt: Date;
    };
}) {
    const response = NextResponse.json({ data: { accessToken: result.accessToken, user: result.user } });
    response.cookies.set('epapers_refresh', result.refreshToken, { ...refreshCookieOptions(), maxAge: Math.max(0, Math.floor((result.session.expiresAt.getTime() - Date.now()) / 1000)) });
    return response;
}
export function clearSession(message = 'Logged out') { const response = NextResponse.json({ data: { message } }); response.cookies.set('epapers_refresh', '', { ...refreshCookieOptions(), maxAge: 0 }); return response; }
