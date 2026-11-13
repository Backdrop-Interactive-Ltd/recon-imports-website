import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function checkWorkersArtifact(directory = resolve('.open-next')) {
  assert.ok(existsSync(join(directory, 'worker.js')), 'Worker entrypoint missing');
  assert.ok(!existsSync(join(directory, 'assets/uploads')), 'Private local uploads entered Worker assets');
  const env = readFileSync(join(directory, 'cloudflare/next-env.mjs'), 'utf8');
  // The adapter embeds these exports; all runtime secrets must come from bindings.
  assert.ok(/^export const production = \{\};\s*export const development = \{\};\s*export const test = \{\};\s*$/.test(env), 'Embedded environment values detected; artifact rejected.');
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      assert.ok(!/^\.env(?:\.|$)|^\.dev\.vars(?:\.|$)/.test(entry.name), 'Environment file entered Worker artifact');
      if (entry.isDirectory()) visit(join(directory, entry.name));
    }
  }
  visit(directory);
  console.log('Worker artifact verified: no embedded env values, env files or local uploads.');
}
