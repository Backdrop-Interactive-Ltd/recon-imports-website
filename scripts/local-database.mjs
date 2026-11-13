import nextEnv from '@next/env';
import pg from 'pg';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

async function execute(binary, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: 'ignore', windowsHide: true });
    const timer = setTimeout(() => { child.kill(); reject(Error('PostgreSQL control timed out.')); }, 70000);
    child.once('error', () => { clearTimeout(timer); reject(Error('PostgreSQL control could not start.')); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(Error('PostgreSQL control failed.')); });
  });
}
const { loadEnvConfig } = nextEnv;
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = value => realpathSync(value).replaceAll('\\', '/').toLowerCase();
export function localDatabaseTarget() {
  if (resolve(process.cwd()) !== root) throw Error('Run local startup from the project directory.');
  loadEnvConfig(root, true, { info() {}, error() {} });
  let url;
  try { url = new URL(process.env.DATABASE_URL); } catch { throw Error('DATABASE_URL is missing or invalid.'); }
  if (url.protocol !== 'postgresql:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '54329' || url.pathname !== '/recon_local') {
    throw Error('Local startup requires the existing recon_local database on loopback port 54329. No database was changed.');
  }
  const directory = resolve(root, '.local/postgres');
  if (!existsSync(join(directory, 'PG_VERSION')) || readFileSync(join(directory, 'PG_VERSION'), 'utf8').trim() !== '18'
    || !existsSync(join(directory, 'global/pg_control')) || !existsSync(join(directory, 'base'))) {
    throw Error('Existing PostgreSQL 18 cluster is missing or incomplete. Refusing initialization or repair.');
  }
  const options = join(directory, 'postmaster.opts');
  if (!existsSync(options)) throw Error('Existing cluster startup identity is missing; review required.');
  const previous = readFileSync(options, 'utf8').replaceAll('\\', '/').toLowerCase();
  if (!previous.includes(canonical(directory)) || !previous.includes('54329')) throw Error('Existing cluster startup identity does not match; review required.');
  return { directory, connectionString: url.toString() };
}
async function verify(target) {
  const client = new pg.Client({ connectionString: target.connectionString, connectionTimeoutMillis: 1500,
    options: '-c default_transaction_read_only=on -c statement_timeout=3000', application_name: 'recon-local-readiness' });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT current_database() AS name, inet_server_port() AS port, current_setting('data_directory') AS directory");
    if (rows[0]?.name !== 'recon_local' || rows[0]?.port !== 54329 || canonical(rows[0].directory) !== canonical(target.directory)) {
      throw Error('Connected database identity differs from the persistent local cluster.');
    }
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || (error.errors?.length && error.errors.every(item => item.code === 'ECONNREFUSED'))) return false;
    throw Error('Local database verification failed. Check credentials, access, and cluster identity; no reset was attempted.');
  } finally { await client.end().catch(() => {}); }
}
export async function ensureLocalDatabase() {
  const target = localDatabaseTarget();
  if (await verify(target)) {
    console.log('Verified existing recon_local at loopback:54329 (.local/postgres).');
    return;
  }
  const pidFile = join(target.directory, 'postmaster.pid');
  if (existsSync(pidFile)) {
    const [pid, directory, , port] = readFileSync(pidFile, 'utf8').trim().split(/\r?\n/);
    if (!/^\d+$/.test(pid) || canonical(directory) !== canonical(target.directory) || port !== '54329') throw Error('Unsafe cluster process identity; startup stopped.');
    let live = true;
    try { process.kill(Number(pid), 0); } catch (error) { if (error.code === 'ESRCH') live = false; else throw Error('Cannot verify cluster process state.'); }
    if (live) throw Error('Cluster PID is live but the expected database is unavailable. Review the process; no duplicate server was started.');
  }
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('This existing cluster requires the installed Windows x64 PostgreSQL binaries.');
  const binary = resolve(dirname(require.resolve('@embedded-postgres/windows-x64')), '../native/bin/pg_ctl.exe');
  console.log('Starting the verified existing PostgreSQL cluster; no initialization, migration, seed, or record updates.');
  try {
    await execute(binary, ['-D', target.directory, '-l', resolve(target.directory, '../postgres-startup.log'), '-o', '-p 54329 -h 127.0.0.1', '-w', '-t', '60', 'start']);
  } catch {
    if (!await verify(target)) throw Error('PostgreSQL could not start. Inspect .local/postgres-startup.log; no files were deleted or reset.');
  }
  if (!await verify(target)) throw Error('PostgreSQL started but the expected database is not ready. Next.js was not started.');
  console.log('Persistent recon_local ready at loopback:54329.');
}
