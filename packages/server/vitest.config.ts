import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            'server-only': fileURLToPath(new URL('./tests/server-only.ts', import.meta.url)),
            '@/lib/routes-helpers': fileURLToPath(new URL('../../apps/web/lib/routes-helpers.ts', import.meta.url)),
            '@/lib/http': fileURLToPath(new URL('../../apps/web/lib/http.ts', import.meta.url)),
        },
    },
    test: {
        setupFiles: ['tests/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
    },
});
