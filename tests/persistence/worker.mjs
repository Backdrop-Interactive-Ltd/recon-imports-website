import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHarness } from '../security/moduleHarness.mjs';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../../lib/generated/prisma/client.ts');
const database = new URL(process.env.DATABASE_URL);
assert.equal(database.hostname, '127.0.0.1');
assert.match(database.pathname, /^\/data02_[a-f0-9]{12}$/);
const root = path.resolve(process.env.DATA02_UPLOAD_ROOT);
assert.ok(root.startsWith(path.resolve('.local/data02') + path.sep));
const originalRoot = path.resolve('public/uploads');
function isolated(filename) {
  const relative = path.relative(originalRoot, filename);
  assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative));
  return path.join(root, relative);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: database.toString(), connectionTimeoutMillis: 1500 }) });
const load = createHarness({
  [path.resolve('lib/prisma.ts')]: { prisma },
  [path.resolve('lib/auth.ts')]: { auth: async () => ({ user: { id: 'data02-admin' } }) },
  'next/navigation': { redirect: () => { throw Error('unexpected redirect'); } },
  'next/cache': { revalidatePath() {} },
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  [path.resolve('lib/uploads/cloudinary.ts')]: { getCloudinaryConfig: () => null, configureCloudinary: () => false, getUploadedImageDeliveryUrl() {}, uploadImageBuffer() {} },
  'node:fs/promises': { mkdir: (p, options) => fs.mkdir(isolated(p), options), writeFile: (p, data, options) => fs.writeFile(isolated(p), data, options) },
}, { console: { ...console, error() {} } });
const settings = await load('lib/siteSettings.ts');
const actions = await load('app/admin/(dashboard)/site-settings/actions.ts');
const upload = await load('app/api/admin/uploads/route.ts');
const server = http.createServer(async (request, response) => {
  try {
    let result;
    if (request.method === 'GET' && request.url === '/settings') result = await settings.getAdminSiteSettings();
    else if (request.method === 'POST' && request.url === '/settings') {
      const parts = []; for await (const part of request) parts.push(part);
      const values = JSON.parse(Buffer.concat(parts).toString()); const form = new FormData();
      for (const [key, value] of Object.entries(values)) form.set(key, value);
      result = await actions.updateSiteSettingsAction({ status: 'idle', message: '' }, form);
    } else if (request.method === 'POST' && request.url === '/upload') {
      const sharp = (await import('sharp')).default;
      const image = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ad1b28' } }).png().toBuffer();
      const form = new FormData(); form.set('folder', 'media'); form.set('file', new File([image], 'synthetic.png', { type: 'image/png' }));
      const uploaded = await upload.POST(new Request('http://localhost/api/admin/uploads', { method: 'POST', body: form }));
      response.statusCode = uploaded.status; result = await uploaded.json();
    } else { response.statusCode = 404; result = { error: 'not found' }; }
    response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(result));
  } catch { response.statusCode = 503; response.end(JSON.stringify({ error: 'Settings unavailable; no fallback form.' })); }
});
server.listen(0, '127.0.0.1', () => process.send?.({ port: server.address().port }));
process.on('message', async message => { if (message === 'stop') { await prisma.$disconnect(); server.close(() => process.exit(0)); } });
