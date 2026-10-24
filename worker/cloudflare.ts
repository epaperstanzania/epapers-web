export default {
    async scheduled(_controller, env): Promise<void> {
        const endpoint = new URL('/api/internal/worker/process', env.EPAPERS_API_ORIGIN);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.EPAPERS_WORKER_TOKEN}` },
            signal: AbortSignal.timeout(55_000),
        });
        if (!response.ok) {
            throw new Error(`Worker batch endpoint returned ${response.status}`);
        }
        console.info('Scheduled worker batch completed', await response.json());
    },
} satisfies ExportedHandler<Env>;