import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createHarness } from './moduleHarness.mjs';

async function launch({ databaseError, portError } = {}) {
  const events = [], errors = [];
  const processStub = new EventEmitter();
  Object.assign(processStub, { argv: ['node', 'scripts/dev-next.mjs'], execPath: process.execPath, env: { PRESERVED: 'yes' } });
  const child = new EventEmitter();
  child.kill = signal => events.push(signal);
  const plan = { origin: 'http://localhost:3000', nextArgs: ['next', 'dev', '--port', '3000'], environment: { AUTH_URL: 'http://localhost:3000', NEXTAUTH_URL: 'http://localhost:3000' } };
  const load = createHarness({
    [path.resolve('scripts/development.mjs')]: {
      developmentPlan: () => plan,
      prepareDevelopmentPort: async () => { events.push('port'); if (portError) throw Error(portError); },
    },
    [path.resolve('scripts/local-database.mjs')]: {
      ensureLocalDatabase: async () => { events.push('database'); if (databaseError) throw Error(databaseError); },
    },
    'node:child_process': { spawn: (binary, args, options) => {
      events.push('next');
      assert.equal(binary, process.execPath);
      assert.deepEqual([...args], plan.nextArgs);
      assert.equal(options.env.PRESERVED, 'yes');
      assert.equal(options.env.AUTH_URL, plan.origin);
      assert.equal(options.env.NEXTAUTH_URL, plan.origin);
      return child;
    } },
  }, { process: processStub, console: { log() {}, error: message => errors.push(message) } });
  await load('scripts/dev-next.mjs');
  return { events, errors, child, processStub };
}

test('default development waits for port safety and database readiness before Next.js; shutdown leaves PostgreSQL alone', async () => {
  const f = await launch();
  assert.deepEqual(f.events, ['port', 'database', 'next']);
  f.processStub.emit('SIGTERM');
  assert.deepEqual(f.events, ['port', 'database', 'next', 'SIGTERM']);
  f.child.emit('exit', 7);
  assert.equal(f.processStub.exitCode, 7);
});

test('database readiness failure stops Next.js and returns a clear error', async () => {
  const f = await launch({ databaseError: 'PostgreSQL could not start. No reset was attempted.' });
  assert.deepEqual(f.events, ['port', 'database']);
  assert.deepEqual(f.errors, ['PostgreSQL could not start. No reset was attempted.']);
  assert.equal(f.processStub.exitCode, 1);
});

test('port conflicts stop startup before touching PostgreSQL or launching a duplicate server', async () => {
  const f = await launch({ portError: 'Startup stopped. Explicit confirmation is required.' });
  assert.deepEqual(f.events, ['port']);
  assert.equal(f.processStub.exitCode, 1);
});
