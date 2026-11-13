import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { preserveTypeMetadata } from './build-isolation.mjs';

const restore = process.env.RECON_ISOLATED_BUILD ? preserveTypeMetadata() : () => {};
try {
  for (const args of [
    [resolve('node_modules/prisma/build/index.js'), 'generate'],
    [resolve('node_modules/next/dist/bin/next'), 'build'],
  ]) {
    const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true, env: process.env });
    const [code] = await once(child, 'exit');
    if (code !== 0) { process.exitCode = code ?? 1; break; }
  }
} finally { restore(); }
