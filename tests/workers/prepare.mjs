import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { parse } from 'comment-json';

// Invoke through the existing EID-03 provenance-checking disposable runner.
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || !/^\/eid03_[a-f0-9]{12}$/.test(url.pathname) ||
    url.pathname !== `/${process.env.EID02B_DATABASE}` || !process.env.EID02B_MARKER?.startsWith('EID-03 isolated disposable ')) {
  throw Error('Workers smoke preparation requires the verified EID-03 disposable runner.');
}
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
try {
  const marker = await db.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  if (marker.rows[0].marker !== process.env.EID02B_MARKER) throw Error('Disposable marker mismatch.');
  const id = `deploy04b-${randomBytes(6).toString('hex')}`;
  const password = randomBytes(24).toString('hex');
  const email = `${id}@example.invalid`;
  await db.query('INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"isActive","updatedAt") VALUES ($1,$2,$3,$4,$5,true,now())',
    [id, 'Synthetic Workers Test', email, await bcrypt.hash(password, 10), 'SUPER_ADMIN']);
  const directory = path.resolve('.local/workers-smoke');
  fs.mkdirSync(directory, { recursive: true });
  const config = JSON.parse(JSON.stringify(parse(fs.readFileSync('wrangler.jsonc', 'utf8'))));
  config.main = path.resolve('tests/workers/employee-probe.mjs');
  config.assets.directory = path.resolve('.open-next/assets');
  delete config.$schema;
  config.hyperdrive = [{ binding: 'HYPERDRIVE', id: '00000000000000000000000000000000', localConnectionString: url.toString() }];
  config.vars = { NEXTJS_ENV: 'production', AUTH_URL: 'http://localhost:8788', WORKERS_SMOKE_TEST_ONLY: 'true' };
  fs.writeFileSync(path.join(directory, 'wrangler.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(directory, '.dev.vars'), `AUTH_SECRET=${randomBytes(32).toString('hex')}\n`);
  fs.writeFileSync(path.join(directory, 'fixture.json'), JSON.stringify({ id, password, email }));
  console.log('Synthetic admin and local-only Hyperdrive configuration prepared; credentials kept in ignored .local/workers-smoke.');
} finally { await db.end(); }
