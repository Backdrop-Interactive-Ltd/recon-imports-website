import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkWorkersArtifact } from '../../scripts/check-workers-artifact.mjs';
import { parseWorkersUploadSize } from '../../scripts/check-workers-upload.mjs';

test('Worker upload budget uses the uncompressed total and rejects missing/oversized summaries', () => {
  assert.deepEqual(parseWorkersUploadSize('Total Upload: 16384.00 KiB / gzip: 2500.00 KiB'), { uncompressedKiB: 16384, gzipKiB: 2500 });
  assert.throws(() => parseWorkersUploadSize('Total Upload: 70000.00 KiB / gzip: 100.00 KiB'), /exceeds/);
  assert.throws(() => parseWorkersUploadSize('No verified summary'), /summary missing/);
});

test('Worker artifact rejects embedded secrets and local uploads without printing secret values', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'recon-workers-artifact-'));
  try {
    fs.mkdirSync(path.join(directory, 'cloudflare'));
    fs.mkdirSync(path.join(directory, 'assets'));
    fs.writeFileSync(path.join(directory, 'worker.js'), 'export default {};');
    const envFile = path.join(directory, 'cloudflare/next-env.mjs');
    const empty = 'export const production = {};\nexport const development = {};\nexport const test = {};\n';
    fs.writeFileSync(envFile, empty);
    checkWorkersArtifact(directory);
    fs.writeFileSync(envFile, empty.replace('production = {}', 'production = {"AUTH_SECRET":"synthetic-do-not-print"}'));
    assert.throws(() => checkWorkersArtifact(directory), error =>
      error.message.includes('Embedded environment values detected') && !error.message.includes('synthetic-do-not-print'));
    fs.writeFileSync(envFile, empty);
    fs.writeFileSync(path.join(directory, '.dev.vars'), 'AUTH_SECRET=synthetic');
    assert.throws(() => checkWorkersArtifact(directory), /Environment file entered/);
    fs.unlinkSync(path.join(directory, '.dev.vars'));
    fs.mkdirSync(path.join(directory, 'assets/uploads'));
    assert.throws(() => checkWorkersArtifact(directory), /Private local uploads/);
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('recon-workers-artifact-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
