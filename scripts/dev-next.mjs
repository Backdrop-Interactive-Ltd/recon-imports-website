import { spawn } from 'node:child_process';
import { ensureLocalDatabase } from './local-database.mjs';
import { developmentPlan, prepareDevelopmentPort } from './development.mjs';

try {
  const plan = developmentPlan(process.argv.slice(2));
  await prepareDevelopmentPort();
  await ensureLocalDatabase();
  console.log(`RECON development: ${plan.origin}`);
  const child = spawn(process.execPath, plan.nextArgs, { stdio: 'inherit', windowsHide: true, env: { ...process.env, ...plan.environment } });
  child.on('error', () => { console.error('Next.js could not start.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
} catch (error) { console.error(error.message); process.exitCode = 1; }
