import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, mkdir, stat, mkdtemp, writeFile } from 'node:fs/promises';
import { fork, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import pg from 'pg';
import { isolatedDistDir, preserveTypeMetadata } from '../../scripts/build-isolation.mjs';
const require = createRequire(import.meta.url);
async function execute(binary, args) {
  const child = spawn(binary, args, { stdio: 'ignore', windowsHide: true });
  const [code] = await once(child, 'exit'); assert.equal(code, 0);
}

test('real PostgreSQL settings and isolated uploads survive worker restart and database outage/recovery', async () => {
  const target = JSON.parse(await readFile('.local/data02-target.json', 'utf8'));
  assert.equal(target.task, 'DATA-02');
  assert.match(target.database, /^data02_[a-f0-9]{12}$/);
  assert.equal(new URL(process.env.DATABASE_URL).pathname, `/${target.database}`);
  assert.equal(new URL(process.env.DATABASE_URL).hostname, '127.0.0.1');
  assert.equal(new URL(process.env.DATABASE_URL).port, String(target.port));
  const connect = async () => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); return c; };
  let client = await connect();
  const marker = (await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0].marker;
  assert.equal(marker, target.marker);
  const uploadRoot = path.resolve(path.dirname(target.directory), 'isolated-uploads');
  await mkdir(uploadRoot, { recursive: true });
  await client.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"updatedAt") VALUES ('data02-admin','Synthetic','data02@example.invalid','not-a-password','SUPER_ADMIN',now()) ON CONFLICT(id) DO NOTHING`);
  let worker, base;
  async function start() {
    worker = fork('tests/persistence/worker.mjs', { execArgv: ['--import', 'tsx', '--experimental-vm-modules'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'], env: { ...process.env, NODE_ENV: 'development', DATA02_UPLOAD_ROOT: uploadRoot } });
    const message = await Promise.race([once(worker, 'message'), once(worker, 'exit').then(([code]) => { throw Error(`Worker exited ${code}`); })]);
    base = `http://127.0.0.1:${message[0].port}`;
  }
  async function stop() { if (!worker || worker.exitCode !== null) return; const done = once(worker, 'exit'); worker.send('stop'); await done; }
  const binary = path.resolve(path.dirname(require.resolve('@embedded-postgres/windows-x64')), '../native/bin/pg_ctl.exe');
  let databaseStopped = false;
  try {
    await start();
    const uploadedResponse = await fetch(base + '/upload', { method: 'POST' });
    assert.equal(uploadedResponse.status, 200); const uploaded = await uploadedResponse.json();
    assert.match(uploaded.url, /^\/uploads\/media\/[a-f0-9-]+\.png$/);
    const imagePath = path.join(uploadRoot, uploaded.url.slice('/uploads/'.length));
    assert.ok((await stat(imagePath)).size > 0);
    const initial = await (await fetch(base + '/settings')).json();
    const values = { ...initial, siteName: 'Synthetic persistence test', websiteLogo: uploaded.url, favicon: uploaded.url };
    assert.equal((await (await fetch(base + '/settings', { method: 'POST', body: JSON.stringify(values) })).json()).status, 'success');
    const stored = (await client.query('SELECT key,value,"updatedAt" FROM "SiteSetting" ORDER BY key')).rows;
    await stop(); await start();
    const reloaded = await (await fetch(base + '/settings')).json();
    assert.equal(reloaded.websiteLogo, uploaded.url); assert.equal(reloaded.favicon, uploaded.url);
    assert.equal(reloaded.siteName, values.siteName); assert.ok((await stat(imagePath)).size > 0);
    await client.end(); client = null;
    await execute(binary, ['-D', target.directory, '-m', 'fast', '-w', 'stop'], { windowsHide: true }); databaseStopped = true;
    assert.equal((await fetch(base + '/settings')).status, 503);
    assert.equal((await fetch(base + '/settings', { method: 'POST', body: JSON.stringify({ ...values, websiteLogo: '/must-not-save.png' }) })).status, 503);
    await execute(binary, ['-D', target.directory, '-l', path.resolve(path.dirname(target.directory), 'restart.log'), '-o', `-p ${target.port} -h 127.0.0.1`, '-w', 'start'], { windowsHide: true }); databaseStopped = false;
    const recovered = await (await fetch(base + '/settings')).json();
    assert.equal(recovered.websiteLogo, uploaded.url);
    client = await connect();
    assert.deepEqual((await client.query('SELECT key,value,"updatedAt" FROM "SiteSetting" ORDER BY key')).rows, stored);
    assert.ok((await stat(imagePath)).size > 0);
  } finally {
    if (databaseStopped) await execute(binary, ['-D', target.directory, '-l', path.resolve(path.dirname(target.directory), 'restart.log'), '-o', `-p ${target.port} -h 127.0.0.1`, '-w', 'start'], { windowsHide: true });
    await stop(); if (client) await client.end();
  }
});

test('favicon fallback exists and test build directories cannot select the normal .next output', async () => {
  const fallback = await readFile('public/favicon.svg', 'utf8'); assert.match(fallback, /<svg/);
  for (const task of ['eid02b', 'eid03', 'data02']) assert.equal(isolatedDistDir(task), `.local/builds/${task}`);
  assert.throws(() => isolatedDistDir('../.next'));
});

test('isolated builds restore generated type metadata and preserve unrelated concurrent edits', async () => {
  const root = await mkdtemp(path.resolve('.local/data02/type-metadata-'));
  const config = JSON.stringify({ include: ['app/**/*.tsx'], compilerOptions: { strict: true } });
  const declarations = '/// <reference types="next" />\nimport "./.next/dev/types/routes.d.ts";\n';
  await writeFile(path.join(root, 'tsconfig.json'), config);
  await writeFile(path.join(root, 'next-env.d.ts'), declarations);
  const restore = preserveTypeMetadata(root);
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ include: ['app/**/*.tsx', '.local/builds/data02/types/**/*.ts'], compilerOptions: { strict: true } }));
  await writeFile(path.join(root, 'next-env.d.ts'), declarations.replace('.next/dev', '.local/builds/data02') + 'import "./.local/builds/data02/types/root-params.d.ts";\n');
  restore();
  assert.equal(await readFile(path.join(root, 'tsconfig.json'), 'utf8'), config);
  assert.equal(await readFile(path.join(root, 'next-env.d.ts'), 'utf8'), declarations);
  const concurrent = preserveTypeMetadata(root);
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ include: ['app/**/*.tsx'], compilerOptions: { strict: false } }));
  concurrent();
  assert.equal(JSON.parse(await readFile(path.join(root, 'tsconfig.json'), 'utf8')).compilerOptions.strict, false);
});

test('normal local startup rejects a different database before connecting or starting PostgreSQL', () => {
  const result = spawnSync(process.execPath, ['scripts/local-db.mjs'], { encoding: 'utf8', windowsHide: true,
    env: { ...process.env, DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/not-the-owner-database' } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires the existing recon_local database/);
  assert.doesNotMatch(result.stdout, /Starting/);
});
