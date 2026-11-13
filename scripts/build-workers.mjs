import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkWorkersArtifact } from './check-workers-artifact.mjs';
import { checkWorkersUpload } from './check-workers-upload.mjs';

// OpenNext embeds .env files and copies public files. Build a separate source
// copy, excluding credentials and local uploads before invoking the adapter.
const root = process.cwd();
const staging = resolve(root, '.local/workers-build/source');
const output = resolve(root, '.open-next');
function contained(target, parent) {
  const name = relative(parent, target);
  if (!name || name.startsWith('..') || resolve(parent, name) !== target) throw Error('Unsafe build path');
}
contained(staging, resolve(root, '.local'));
contained(output, root);
mkdirSync(staging, { recursive: true });
if (relative(realpathSync(root), realpathSync(staging)) !== relative(root, staging)) {
  throw Error('Workers staging path resolves outside its intended directory.');
}
if (existsSync(output) && relative(realpathSync(root), realpathSync(output)) !== relative(root, output)) {
  throw Error('Workers output path resolves outside its intended directory.');
}
const excluded = new Set(['.git', '.local', '.next', '.open-next', '.wrangler', 'node_modules', 'next-env.d.ts']);
const inputs = new Set(['app', 'lib', 'prisma', 'scripts', 'public', 'types',
  'next.config.mjs', 'open-next.config.ts', 'package.json', 'package-lock.json',
  'prisma.config.ts', 'tsconfig.json', 'wrangler.jsonc']);
function filter(source) {
  const parts = relative(root, source).split(sep);
  return inputs.has(parts[0]) && !parts.some(part => excluded.has(part) || part.startsWith('.env') || part.startsWith('.dev.vars') || /\.(?:tsbuildinfo|log|dump|backup|pem|key|sqlite|db)$/.test(part)) &&
    !(parts[0] === 'public' && parts[1] === 'uploads');
}
// Clean only generated staging source. Reuse installed dependencies if unchanged.
for (const item of readdirSync(staging)) {
  if (item === 'node_modules' || item === '.dependencies.sha256') continue;
  const target = join(staging, item); contained(target, staging);
  rmSync(target, { recursive: true, force: true });
}
for (const item of readdirSync(root)) {
  const source = join(root, item);
  if (filter(source)) cpSync(source, join(staging, item), { recursive: true, filter });
}
// Prisma's Node client compiles embedded WASM at runtime, which workerd forbids.
// Change only the generator target in the disposable source copy. Models,
// migrations and the owner's generated Node client remain unchanged.
const schemaPath = join(staging, 'prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');
if (!/generator client\s*\{/.test(schema)) throw Error('Prisma client generator missing.');
writeFileSync(schemaPath, schema.replace(/generator client\s*\{/, 'generator client {\n  runtime = "workerd"'));
const env = { ...process.env, RECON_ISOLATED_BUILD: '', RECON_WORKERS_BUILD: '1', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' };
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: staging, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Workers build step failed (exit ${result.status ?? 1}).`);
}
const hash = createHash('sha256').update(readFileSync(join(staging, 'package-lock.json'))).digest('hex');
const marker = join(staging, '.dependencies.sha256');
if (!existsSync(join(staging, 'node_modules')) || !existsSync(marker) || readFileSync(marker, 'utf8') !== hash) {
  const npm = process.env.npm_execpath ?? resolve(process.execPath, '../node_modules/npm/bin/npm-cli.js');
  run([npm, 'ci', '--include=dev', '--no-audit', '--no-fund']);
  writeFileSync(marker, hash);
}
run(['--import', pathToFileURL(join(staging, 'scripts/windows-workers-links.mjs')).href, join(staging, 'node_modules/@opennextjs/cloudflare/dist/cli/index.js'), 'build', ...process.argv.slice(2)]);
const compiled = join(staging, '.open-next');
checkWorkersArtifact(compiled);
checkWorkersUpload(staging);
// Replace generated output only after success. Never touch the source tree.
rmSync(output, { recursive: true, force: true });
cpSync(compiled, output, { recursive: true });
console.log('Workers artifact ready; source .env files and local uploads excluded.');
