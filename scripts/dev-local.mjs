import { ensureLocalDatabase } from './local-database.mjs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

try {
  await ensureLocalDatabase();
  const child = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'dev', '--webpack'], { stdio: 'inherit', windowsHide: true, env: process.env });
  child.on('error', () => { console.error('Next.js could not start.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  // PostgreSQL stays independent of the terminal. Never terminate another database instance.
} catch (error) { console.error(error.message); process.exitCode = 1; }
