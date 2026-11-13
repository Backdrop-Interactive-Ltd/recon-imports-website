import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export function parseWorkersUploadSize(output) {
  const match = /Total Upload:\s*([\d.]+) KiB\s*\/\s*gzip:\s*([\d.]+) KiB/.exec(output);
  if (!match) throw Error('Wrangler upload-size summary missing; compatibility check cannot be confirmed.');
  const bytes = Number(match[1]) * 1024;
  // Current documented Free/Paid limit: 64 MiB uncompressed, not a gzip limit.
  if (bytes > 64 * 1024 * 1024) throw Error('Worker exceeds the verified 64 MiB uncompressed bundle budget.');
  return { uncompressedKiB: Number(match[1]), gzipKiB: Number(match[2]) };
}

export function checkWorkersUpload(directory = process.cwd()) {
  const result = spawnSync(process.execPath, [
    resolve(directory, 'node_modules/wrangler/bin/wrangler.js'),
    'deploy', '--dry-run', '--config', resolve(directory, 'wrangler.jsonc'),
    '--outdir', resolve(directory, '.worker-upload-check'),
  ], { cwd: directory, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '');
    throw Error('Local Wrangler bundle validation failed. Nothing was uploaded.');
  }
  const size = parseWorkersUploadSize(result.stdout);
  console.log(`Local Wrangler dry run passed: ${size.uncompressedKiB} KiB raw, ${size.gzipKiB} KiB gzip. Nothing uploaded.`);
  return size;
}
