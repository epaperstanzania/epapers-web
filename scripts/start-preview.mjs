import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { previewEnv,previewPorts } from './preview-env.mjs';
const app=process.argv[2];if(!Object.hasOwn(previewPorts,app))throw new Error('Choose a known preview app');
const cwd=path.resolve(import.meta.dirname,'../apps',app),require=createRequire(path.join(cwd,'package.json'));
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','-p',String(previewPorts[app])],{cwd,env:{...process.env,...previewEnv,NEXT_PUBLIC_AUTH_MODE:process.env.EPAPERS_TEST_AUTH_MODE || 'bridge'},stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1;});
