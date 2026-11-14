import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deploymentAllowed, uploadConfig } from '../../scripts/deploy-workers-ci.mjs';

test('CI cannot deploy other branches or run before explicit enablement', () => {
  const env = { WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main', RECON_AUTODEPLOY_ENABLED: '1' };
  assert.equal(deploymentAllowed(env), true);
  for (const change of [{ WORKERS_CI: undefined }, { WORKERS_CI_BRANCH: 'feature' }, { RECON_AUTODEPLOY_ENABLED: undefined }]) {
    assert.equal(deploymentAllowed({ ...env, ...change }), false);
  }
});

test('CI reuses existing bindings but cannot publish Custom Domain/DNS changes', () => {
  const original = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const output = uploadConfig(original);
  assert.equal(output.routes, undefined);
  assert.equal(original.routes.length, 2);
  assert.deepEqual(output.hyperdrive, original.hyperdrive);
  assert.deepEqual(output.r2_buckets, original.r2_buckets);
  assert.deepEqual(output.durable_objects, original.durable_objects);
  assert.deepEqual(output.vars, original.vars);
  assert.throws(() => uploadConfig({ ...original, name: 'duplicate-worker' }));
  assert.throws(() => uploadConfig({ ...original, hyperdrive: [] }));
  assert.throws(() => uploadConfig({ ...original, routes: [] }));
});
