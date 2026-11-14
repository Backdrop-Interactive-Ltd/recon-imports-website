import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const worker = 'recon-imports-website';
const requiredSecrets = ['AUTH_SECRET', 'AUTH_URL', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_CLOUD_NAME'];

export function uploadConfig(config) {
  assert.equal(config.name, worker);
  assert.equal(config.main, '.open-next/worker.js');
  assert.deepEqual(config.routes, [
    { pattern: 'www.reconimports.com', custom_domain: true },
    { pattern: 'reconimports.com', custom_domain: true },
  ]);
  assert.equal(config.hyperdrive?.[0]?.id, '02364ff5b23e47a8889958733e06d1da');
  assert.equal(config.r2_buckets?.[0]?.bucket_name, 'recon-imports-next-cache');
  const result = { ...config };
  // Existing Custom Domains are managed separately. CI must not replace DNS.
  delete result.routes;
  return result;
}

export function deploymentAllowed(env) {
  return env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main' && env.RECON_AUTODEPLOY_ENABLED === '1';
}

async function main() {
  assert.ok(process.argv.length === 3 && ['--dry-run', '--deploy'].includes(process.argv[2]));
  const deploy = process.argv[2] === '--deploy';
  const staging = path.resolve('.local/workers-build/source');
  const config = uploadConfig(JSON.parse(fs.readFileSync(path.join(staging, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')));
  assert.ok(fs.existsSync(path.join(staging, config.main)), 'Run npm run build:workers first');
  const env = { ...process.env, OPEN_NEXT_DEPLOY: 'true', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' };
  let before;
  async function settings() {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${worker}/settings`, {
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    assert.ok(response.ok && data.success, 'Existing Worker must be accessible; refusing creation');
    return data.result;
  }
  const bindings = value => [...value.bindings].sort((a, b) => a.name.localeCompare(b.name));
  if (deploy) {
    assert.ok(deploymentAllowed(env), 'Automatic deployment is not enabled for main');
    assert.match(env.CLOUDFLARE_ACCOUNT_ID ?? '', /^[a-f0-9]{32}$/);
    assert.ok(env.CLOUDFLARE_API_TOKEN, 'Private build deployment token required');
    for (const name of [...requiredSecrets, 'DATABASE_URL', 'ADMIN_PASSWORD']) {
      assert.ok(!env[name], 'Runtime credentials must not be supplied to CI');
    }
    before = await settings();
    for (const name of requiredSecrets) assert.ok(before.bindings.some(b => b.name === name && b.type === 'secret_text'));
  }
  const file = path.join(staging, '.ci-upload-config.json');
  let created = false;
  try {
    fs.writeFileSync(file, JSON.stringify(config), { flag: 'wx' });
    created = true;
    const result = spawnSync(process.execPath, [path.join(staging, 'node_modules/wrangler/bin/wrangler.js'),
      'deploy', '--config', file, '--no-autoconfig', ...(deploy ? [] : ['--dry-run']),
    ], { cwd: staging, env, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    // Never relay raw CLI output or API responses to public CI logs.
    assert.ok(!result.error && result.status === 0, 'Wrangler failed; no automatic retry');
    if (deploy) {
      const after = await settings();
      assert.deepEqual(bindings(after), bindings(before), 'Binding/secret descriptors changed; operator review required');
      assert.deepEqual(after.limits, before.limits);
      assert.equal(after.usage_model, before.usage_model);
    }
    console.log(deploy ? 'Existing Worker deployed; bindings and secret descriptors preserved.' : 'CI deployment dry run passed; nothing uploaded.');
  } finally {
    if (created) fs.unlinkSync(file);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('CI deployment stopped; no automatic retry. Check configuration and permissions privately.'); process.exitCode = 1; });
}
