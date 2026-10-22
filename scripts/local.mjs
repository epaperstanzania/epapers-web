import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { portalEnvironment } from './portal-env.mjs';
const require = createRequire(import.meta.url);
const task = process.argv[2];
if (!['dev', 'typecheck'].includes(task)) throw new Error('Choose dev or typecheck');
const child = spawn(process.execPath, [require.resolve('turbo/bin/turbo'), 'run', task, ...process.argv.slice(3)], {
  env: { ...process.env, ...portalEnvironment(), NODE_ENV: 'development' },
  stdio: 'inherit', windowsHide: true,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
