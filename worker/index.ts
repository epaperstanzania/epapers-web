import { logger } from '@epapers/server/lib/logger';
import { runWorker } from '@epapers/server/jobs/index';

runWorker().catch(() => {
	logger.error('Worker failed');
	process.exitCode = 1;
});
