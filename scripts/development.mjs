import { createServer } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const execute = promisify(execFile);
export const developmentOrigin = 'http://localhost:3000';
export function developmentPlan(args = []) {
  if (args.length) throw Error('Development uses localhost:3000 only; port and hostname overrides are not accepted.');
  return {
    port: 3000, origin: developmentOrigin,
    environment: { AUTH_URL: developmentOrigin, NEXTAUTH_URL: developmentOrigin },
    nextArgs: [resolve('node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', 'localhost', '--port', '3000'],
  };
}
export async function assertDevelopmentPortAvailable(port = 3000) {
  for (const host of ['127.0.0.1', '::1']) {
    await new Promise((resolveCheck, reject) => {
      const server = createServer();
      server.once('error', error => {
        if (host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) resolveCheck();
        else reject(Error('Development port is unavailable.'));
      });
      server.listen({ host, port, exclusive: true }, () => server.close(error => error ? reject(error) : resolveCheck()));
    });
  }
}
export function requireVerifiedDevelopmentGroups(groups) {
  if (!groups.length || groups.some(g => g.kind !== 'RECON_NEXT_DEV' || !g.members?.length)) throw Error('Port 3000 has an unrelated or unverified listener; no process will be stopped.');
}
export async function inspectDevelopmentGroups() {
  if (process.platform !== 'win32') throw Error('Review and stop conflicting development servers manually on this platform.');
  const result = await execute('powershell.exe', ['-NoProfile', '-File', resolve('scripts/development-processes.ps1'), '-Mode', 'Inspect'], { windowsHide: true });
  return JSON.parse(result.stdout.trim());
}
export function stopConfirmedDevelopmentGroups(groups, confirmation) {
  requireVerifiedDevelopmentGroups(groups);
  if (confirmation !== 'STOP') throw Error('No process was stopped; explicit STOP confirmation is required.');
  if (process.platform !== 'win32') throw Error('Automatic process management is unavailable on this platform.');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-File', resolve('scripts/development-processes.ps1'), '-Mode', 'Stop'], {
    windowsHide: true, encoding: 'utf8', input: JSON.stringify({ groups, confirmation }), maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw Error('Process verification/stop failed. Nothing else will be terminated; inspect the listeners again.');
  return JSON.parse(result.stdout.trim());
}
export async function prepareDevelopmentPort() {
  try { await assertDevelopmentPortAvailable(); return; } catch {}
  const groups = await inspectDevelopmentGroups();
  requireVerifiedDevelopmentGroups(groups);
  console.log('Port 3000 is occupied by verified RECON Next.js development servers:', groups.map(g => g.listenerId).join(', '));
  if (!process.stdin.isTTY) throw Error('Startup stopped. Run interactively to review and confirm stopping these servers.');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try { answer = await prompt.question('Stop only these RECON Next.js servers and their verified Node launchers? Type STOP to confirm: '); }
  finally { prompt.close(); }
  stopConfirmedDevelopmentGroups(groups, answer);
  await new Promise(resolveWait => setTimeout(resolveWait, 500));
  await assertDevelopmentPortAvailable();
}
