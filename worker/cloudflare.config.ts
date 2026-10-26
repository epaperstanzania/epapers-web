import { bindings, defineConfig, triggers } from 'cf/config';
import * as entrypoint from './cloudflare.ts' with { type: 'cf-worker' };

export default defineConfig({
    worker: {
        name: 'epapers-background-worker',
        entrypoint,
        compatibilityDate: '2026-10-24',
        env: {
            EPAPERS_API_ORIGIN: bindings.text('https://www.epapers.co.tz'),
            EPAPERS_WORKER_TOKEN: bindings.secret(),
        },
        triggers: [triggers.scheduled({ schedule: '*/1 * * * *' })],
        observability: {
            logs: {
                enabled: true,
                headSamplingRate: 1,
                invocationLogs: true,
                persist: true,
            },
            traces: {
                enabled: false,
                headSamplingRate: 1,
                persist: true,
            },
        },
    },
});