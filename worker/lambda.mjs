import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const secretKeys = new Set([
    'APP_ORIGIN',
    'API_ORIGIN',
    'PORTAL_ORIGINS',
    'COOKIE_DOMAIN',
    'TRUST_PROXY',
    'DATA_ENCRYPTION_KEY',
    'DATABASE_URL',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_INCOMING_BUCKET',
    'R2_PUBLISHED_BUCKET',
    'R2_PUBLIC_BASE_URL',
    'JWT_ACCESS_SECRET',
    'REFRESH_TOKEN_PEPPER',
    'IP_HASH_SALT',
    'EMAIL_FROM',
    'SMTP_DAILY_LIMIT',
    'EMAIL_PROVIDER',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
    'RESEND_API_KEY',
    'MAX_UPLOAD_BYTES',
    'DAILY_UPLOAD_QUOTA',
    'SIGNED_URL_TTL_SECONDS',
    'LOG_LEVEL',
]);

const secretsClient = new SecretsManagerClient({});
let initialization;
let processor;

async function initialize() {
    if (!initialization) {
        const attempt = (async () => {
            const secretId = process.env.EPAPERS_SECRET_ARN;
            if (!secretId) {
                throw new Error('EPAPERS_SECRET_ARN is not configured');
            }

            const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
            if (!result.SecretString) {
                throw new Error('The EPapers worker secret must use a JSON SecretString');
            }

            const values = JSON.parse(result.SecretString);
            if (values === null || Array.isArray(values) || typeof values !== 'object') {
                throw new Error('The EPapers worker secret must be a JSON object');
            }
            for (const [key, value] of Object.entries(values)) {
                if (!secretKeys.has(key) || typeof value !== 'string') {
                    throw new Error(`Invalid key or value in EPapers worker secret: ${key}`);
                }
                process.env[key] = value;
            }

            process.env.NODE_ENV = 'production';
            process.env.EPAPERS_WORKER_MODE = 'lambda';
        })();
        initialization = attempt.catch((error) => {
            initialization = undefined;
            throw error;
        });
    }

    await initialization;
    if (!processor) {
        processor = await import('@epapers/server/jobs/index');
    }
    return processor;
}

export async function handler(_event, context) {
    context.callbackWaitsForEmptyEventLoop = false;

    const { processBatch } = await initialize();
    const configuredMaxJobs = Number(process.env.EPAPERS_WORKER_MAX_JOBS ?? 20);
    const maxRuntimeMs = Math.max(
        1_000,
        Math.min(270_000, context.getRemainingTimeInMillis() - 30_000),
    );
    const processed = await processBatch({
        maxJobs: configuredMaxJobs,
        maxRuntimeMs,
    });

    console.info('Background worker batch completed', { processed });
    return { processed };
}
