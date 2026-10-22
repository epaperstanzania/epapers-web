/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from 'cloudflare:workers';

interface CloudflareBindings {
    EPAPERS_WORKER: DurableObjectNamespace<EpapersWorkerContainer>;
    APP_ORIGIN: string;
    API_ORIGIN: string;
    PORTAL_ORIGINS: string;
    COOKIE_DOMAIN: string;
    TRUST_PROXY: string;
    DATABASE_URL: string;
    DATA_ENCRYPTION_KEY: string;
    JWT_ACCESS_SECRET: string;
    REFRESH_TOKEN_PEPPER: string;
    IP_HASH_SALT: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_ENDPOINT: string;
    R2_INCOMING_BUCKET: string;
    R2_PUBLISHED_BUCKET: string;
    R2_PUBLIC_BASE_URL: string;
    EMAIL_PROVIDER: 'smtp' | 'resend';
    EMAIL_FROM: string;
    SMTP_DAILY_LIMIT: string;
    SMTP_PORT: string;
    SMTP_SECURE: string;
    SMTP_HOST: string;
    SMTP_USER: string;
    SMTP_PASSWORD: string;
    SMTP_FROM: string;
    RESEND_API_KEY: string;
    LOG_LEVEL: string;
}

function requiredSetting(value: string | undefined, name: string): string {
    if (!value?.trim()) {
        throw new Error(`Missing Cloudflare Worker secret or variable: ${name}`);
    }
    return value;
}

function containerEnvironment(env: CloudflareBindings): Record<string, string> {
    const values: Record<string, string> = {
        NODE_ENV: 'production',
        PORT: '8080',
        APP_ORIGIN: requiredSetting(env.APP_ORIGIN, 'APP_ORIGIN'),
        API_ORIGIN: requiredSetting(env.API_ORIGIN, 'API_ORIGIN'),
        PORTAL_ORIGINS: requiredSetting(env.PORTAL_ORIGINS, 'PORTAL_ORIGINS'),
        COOKIE_DOMAIN: env.COOKIE_DOMAIN,
        TRUST_PROXY: env.TRUST_PROXY,
        DATABASE_URL: requiredSetting(env.DATABASE_URL, 'DATABASE_URL'),
        DATA_ENCRYPTION_KEY: requiredSetting(env.DATA_ENCRYPTION_KEY, 'DATA_ENCRYPTION_KEY'),
        JWT_ACCESS_SECRET: requiredSetting(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
        REFRESH_TOKEN_PEPPER: requiredSetting(env.REFRESH_TOKEN_PEPPER, 'REFRESH_TOKEN_PEPPER'),
        IP_HASH_SALT: requiredSetting(env.IP_HASH_SALT, 'IP_HASH_SALT'),
        R2_ACCOUNT_ID: requiredSetting(env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID'),
        R2_ACCESS_KEY_ID: requiredSetting(env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID'),
        R2_SECRET_ACCESS_KEY: requiredSetting(env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY'),
        R2_ENDPOINT: requiredSetting(env.R2_ENDPOINT, 'R2_ENDPOINT'),
        R2_INCOMING_BUCKET: requiredSetting(env.R2_INCOMING_BUCKET, 'R2_INCOMING_BUCKET'),
        R2_PUBLISHED_BUCKET: requiredSetting(env.R2_PUBLISHED_BUCKET, 'R2_PUBLISHED_BUCKET'),
        R2_PUBLIC_BASE_URL: env.R2_PUBLIC_BASE_URL ?? '',
        EMAIL_PROVIDER: env.EMAIL_PROVIDER,
        EMAIL_FROM: env.EMAIL_FROM,
        SMTP_DAILY_LIMIT: env.SMTP_DAILY_LIMIT,
        LOG_LEVEL: env.LOG_LEVEL,
    };

    if (env.EMAIL_PROVIDER === 'smtp') {
        values.SMTP_HOST = requiredSetting(env.SMTP_HOST, 'SMTP_HOST');
        values.SMTP_PORT = env.SMTP_PORT;
        values.SMTP_SECURE = env.SMTP_SECURE;
        values.SMTP_USER = requiredSetting(env.SMTP_USER, 'SMTP_USER');
        values.SMTP_PASSWORD = requiredSetting(env.SMTP_PASSWORD, 'SMTP_PASSWORD');
        values.SMTP_FROM = requiredSetting(env.SMTP_FROM, 'SMTP_FROM');
    } else {
        values.RESEND_API_KEY = requiredSetting(env.RESEND_API_KEY, 'RESEND_API_KEY');
    }

    return values;
}

export class EpapersWorkerContainer extends DurableObject<CloudflareBindings> {
    private ensuring: Promise<void> | undefined;

    async keepAlive(): Promise<void> {
        if (!this.ensuring) {
            const attempt = this.ensureRunning();
            this.ensuring = attempt.finally(() => {
                this.ensuring = undefined;
            });
        }

        await this.ensuring;
    }

    private async ensureRunning(): Promise<void> {
        const container = this.ctx.container;
        if (!container) {
            throw new Error('Cloudflare Container binding is unavailable');
        }

        if (!container.running) {
            const image = container.images.worker;
            if (!image) {
                throw new Error('Cloudflare worker container image is not configured');
            }

            container.start({
                image,
                instance: 'basic',
                enableInternet: true,
                env: containerEnvironment(this.env),
            });
        }

        await container.setInactivityTimeout(120_000);
        const port = container.getTcpPort(8080);
        let lastError: unknown;

        for (let attempt = 0; attempt < 60; attempt += 1) {
            try {
                const response = await port.fetch('http://container/health', {
                    signal: AbortSignal.timeout(1_000),
                });
                await response.body?.cancel();
                if (!response.ok) {
                    throw new Error(`Worker container health check returned ${response.status}`);
                }
                return;
            } catch (error) {
                lastError = error;
                await scheduler.wait(500);
            }
        }

        throw new Error('Worker container did not become healthy on port 8080', {
            cause: lastError,
        });
    }
}

export default {
    async fetch(request: Request, env: CloudflareBindings): Promise<Response> {
        const url = new URL(request.url);
        if (request.method !== 'GET' || url.pathname !== '/health') {
            return new Response('Not found', { status: 404 });
        }

        await env.EPAPERS_WORKER.getByName('epapers-worker').keepAlive();
        return Response.json({ status: 'ok' });
    },
    async scheduled(_controller: ScheduledController, env: CloudflareBindings): Promise<void> {
        await env.EPAPERS_WORKER.getByName('epapers-worker').keepAlive();
    },
} satisfies ExportedHandler<CloudflareBindings>;
