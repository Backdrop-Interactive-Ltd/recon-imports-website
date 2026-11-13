import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { webcrypto, createHash } from 'node:crypto';
import { createHarness } from './moduleHarness.mjs';

test('Prisma uses request-local Worker clients, never the Node connection fallback', async () => {
  const configurations = [];
  let context;
  const load = createHarness({
    '@opennextjs/cloudflare/cloudflare-context': { getCloudflareContext() {
      if (!context) throw Error('Not a Worker');
      return context;
    } },
    '@prisma/adapter-pg': { PrismaPg: class { constructor(config) { this.config = config; configurations.push(config); } } },
    [path.resolve('lib/generated/prisma/client.ts')]: { PrismaClient: class {
      constructor({ adapter }) { this.identity = adapter; }
      bound() { return this.identity; }
    } },
  }, { process: { env: { NODE_ENV: 'production', DATABASE_URL: 'postgresql://node-only.invalid/app' } } });
  const { prisma } = await load('lib/prisma.ts');
  const nodeClient = prisma.bound();
  assert.equal(configurations[0].connectionString, 'postgresql://node-only.invalid/app');
  context = { ctx: {}, env: { HYPERDRIVE: { connectionString: 'postgresql://worker.invalid/app' }, DATABASE_URL: 'postgresql://ignored.invalid/app' } };
  const first = prisma.bound();
  assert.notEqual(first, nodeClient);
  assert.equal(prisma.bound(), first);
  assert.equal(first.config.connectionString, 'postgresql://worker.invalid/app');
  assert.equal(first.config.maxUses, 1);
  context = { ctx: {}, env: { DATABASE_URL: 'postgresql://direct-worker.invalid/app' } };
  assert.notEqual(prisma.bound(), first);
  assert.equal(prisma.bound().config.connectionString, 'postgresql://direct-worker.invalid/app');
  context = { ctx: {}, env: {} };
  assert.throws(() => prisma.bound(), /Workers requires/);
  context = undefined;
  assert.equal(prisma.bound(), nodeClient);
});

test('Cloudinary upload is signed multipart HTTPS with no secret in request fields', async () => {
  const calls = [];
  const config = { CLOUDINARY_CLOUD_NAME: 'synthetic-cloud', CLOUDINARY_API_KEY: 'synthetic-key', CLOUDINARY_API_SECRET: 'synthetic-secret' };
  let failure = false;
  const load = createHarness({}, {
    process: { env: config }, crypto: webcrypto, TextEncoder, Blob, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      return failure ? Response.json({ error: { message: 'private vendor detail' } }, { status: 401 }) :
        Response.json({ public_id: 'synthetic-id', secure_url: 'https://res.cloudinary.com/synthetic-cloud/image/upload/v1/synthetic.png' });
    },
  });
  const cloud = await load('lib/uploads/cloudinary.ts');
  assert.equal(cloud.configureCloudinary(), true);
  const uploaded = await cloud.uploadImageBuffer(Buffer.from('synthetic-image'), 'media');
  assert.equal(uploaded.public_id, 'synthetic-id');
  const call = calls[0];
  assert.equal(call.url, 'https://api.cloudinary.com/v1_1/synthetic-cloud/image/upload');
  assert.equal(call.method, 'POST');
  const fields = call.body;
  const expected = createHash('sha256').update(`folder=recon-imports/admin/media&timestamp=${fields.get('timestamp')}&unique_filename=true&use_filename=true${config.CLOUDINARY_API_SECRET}`).digest('hex');
  assert.equal(fields.get('signature'), expected);
  assert.equal(fields.get('file').size, 15);
  assert.ok(![...fields.values()].some(value => String(value).includes(config.CLOUDINARY_API_SECRET)));
  failure = true;
  await assert.rejects(cloud.uploadImageBuffer(Buffer.from('x'), 'media'), /^Error: Cloudinary upload failed\.$/);
  delete config.CLOUDINARY_API_SECRET;
  assert.equal(cloud.configureCloudinary(), false);
  await assert.rejects(cloud.uploadImageBuffer(Buffer.from('x'), 'media'), /not configured/);
});
