import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';
import { fixture as employeeFixture } from '../employees/fixture.mjs';
import { fallbackSiteSettings } from '../../lib/siteSettingsConfig.ts';
import { createRequire } from 'node:module';
const { encodeReply } = createRequire(import.meta.url)('next/dist/compiled/react-server-dom-webpack/client.node');

const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1');
assert.match(url.pathname, /^\/eid03_[a-f0-9]{12}$/);
assert.equal(url.pathname, `/${process.env.EID02B_DATABASE}`);
const fixture = JSON.parse(fs.readFileSync('.local/workers-smoke/fixture.json', 'utf8'));
assert.match(fixture.id, /^deploy04b-[a-f0-9]{12}$/);
const origin = 'http://localhost:8788';
const cookies = new Map();
const results = [];
async function request(path, options = {}, authenticated = true) {
  const response = await fetch(origin + path, { ...options, redirect: 'manual', headers: {
    ...(authenticated ? { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') } : {}),
    ...options.headers,
  } });
  if (authenticated) for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';'); const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
function passed(check) { results.push(check); console.log(`PASS ${check}`); }
function privateResponse(response) { assert.match(response.headers.get('cache-control') ?? '', /no-store/); }
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
try {
  const marker = await db.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  assert.equal(marker.rows[0].marker, process.env.EID02B_MARKER);
  await db.query('UPDATE "AdminUser" SET "isActive"=true WHERE id=$1', [fixture.id]);
  const about = await request('/about-us');
  assert.equal(about.status, 200); assert.match((await about.text()).replace(/<[^>]*>/g, ' '), /BEYOND\s+AUTOMOTIVE/);
  passed('public About Us rendering');
  const denied = await request('/admin', {}, false);
  assert.equal(denied.status, 307); assert.equal(denied.headers.get('location'), '/admin/login'); privateResponse(denied);
  passed('anonymous dashboard denial and private cache headers');
  const upload = await request('/api/admin/uploads', { method: 'POST' }, false);
  assert.equal(upload.status, 401); privateResponse(upload);
  passed('anonymous upload denied');
  const csrf = await (await request('/api/auth/csrf')).json();
  const login = await request('/api/auth/callback/credentials', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: fixture.email, password: fixture.password, callbackUrl: '/admin' }),
  });
  assert.equal(login.status, 302); assert.equal(login.headers.get('location'), origin + '/admin');
  const sessionCookie = login.headers.getSetCookie().find(value => value.startsWith('__Secure-authjs.session-token='));
  assert.ok(sessionCookie && /;\s*Secure(?:;|$)/i.test(sessionCookie), 'session cookie must be Secure');
  assert.ok(/;\s*HttpOnly(?:;|$)/i.test(sessionCookie), 'session cookie must be HttpOnly');
  assert.ok(/;\s*SameSite=Lax(?:;|$)/i.test(sessionCookie), 'session cookie must preserve SameSite=Lax');
  assert.ok([...cookies.keys()].some(name => name === '__Secure-authjs.session-token'));
  const sessionResponse = await request('/api/auth/session'); privateResponse(sessionResponse);
  const session = await sessionResponse.json(); assert.equal(session.user.id, fixture.id);
  passed('real Credentials login, secure session cookie and JWT session');
  for (const page of ['/admin', '/admin/site-settings', '/admin/users']) {
    const response = await request(page); assert.equal(response.status, 200, page); privateResponse(response);
    assert.ok((await response.text()).length > 1000);
  }
  passed('authenticated dashboard/settings/user pages over Hyperdrive and Prisma 7');
  const parallel = await Promise.all(Array.from({ length: 6 }, () => request('/admin/users')));
  assert.ok(parallel.every(response => response.status === 200));
  await Promise.all(parallel.map(response => response.text()));
  passed('six concurrent authenticated database requests without shared socket errors');
  const manifest = JSON.parse(fs.readFileSync('.open-next/server-functions/default/.next/server/server-reference-manifest.json', 'utf8'));
  const action = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === 'updateSiteSettingsAction')?.[0];
  assert.ok(action, 'settings Server Action must exist in built manifest');
  const settings = { ...fallbackSiteSettings, siteName: `Synthetic Workers ${fixture.id}` };
  const form = new FormData();
  for (const [key, value] of Object.entries(settings)) form.set(key, value);
  const actionBody = await encodeReply([{ status: 'idle', message: '' }, form]);
  const saved = await request('/admin/site-settings', { method: 'POST', body: actionBody,
    headers: { 'Next-Action': action, Origin: origin, Accept: 'text/x-component' } });
  assert.equal(saved.status, 200); privateResponse(saved);
  const saveResult = await saved.text();
  fs.writeFileSync('.local/workers-smoke/action-result.txt', saveResult);
  assert.ok(saveResult.includes('Site settings updated successfully.'), 'real Server Action save must succeed');
  const savedRow = await db.query('SELECT value FROM "SiteSetting" WHERE key=$1', ['siteName']);
  assert.equal(savedRow.rows[0].value, settings.siteName);
  let rendered;
  for (let attempt = 0; attempt < 8; attempt++) {
    rendered = await (await request('/about-us')).text();
    if (rendered.includes(settings.siteName)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(rendered.includes(settings.siteName), 'path invalidation must expose saved settings');
  passed('real settings Server Action transaction and R2/DO path invalidation');
  const image = await request('/_next/image?url=%2Frecon-logo.webp&w=256&q=75');
  assert.equal(image.status, 200); assert.match(image.headers.get('content-type') ?? '', /^image\//);
  assert.ok((await image.arrayBuffer()).byteLength > 100);
  const pdf = await request('/stock-list.pdf');
  assert.equal(pdf.status, 200); assert.match(pdf.headers.get('content-type') ?? '', /application\/pdf/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  passed('Next Image delivery through Images binding and standalone PDF generation');
  const employees = await employeeFixture();
  try {
    const employee = await employees.employee();
    const name = `Worker publication ${employee.id}`;
    const revision = await employees.submitted(employee.id, { publicName: name });
    const directory = await employees.approved(employee.id, revision.revision);
    await employees.call('publishEmployeeProfile', employee.id, { approvalId: directory.id });
    const identity = await employees.call('issueVerificationIdentity', employee.id);
    const verification = await employees.approved(employee.id, revision.revision, 'VERIFICATION');
    await employees.call('publishEmployeeProfile', employee.id, { approvalId: verification.id });
    const directoryPath = `/__workers-test/employees?search=${encodeURIComponent(name)}`;
    const verificationPath = `/__workers-test/employees?key=${identity.publicKey}`;
    const listed = await request(directoryPath); privateResponse(listed);
    assert.equal((await listed.json()).length, 1);
    assert.equal((await (await request(verificationPath)).json()).active, true);
    await employees.call('resignEmployee', employee.id);
    assert.deepEqual(await (await request(directoryPath)).json(), []);
    assert.equal(await (await request(verificationPath)).json(), null);
    passed('actual Worker employee queries immediately revoke directory and verification after resignation');
  } finally { await employees.close(); }
  const noCloud = await request('/api/admin/uploads', { method: 'POST' });
  assert.equal(noCloud.status, 503); privateResponse(noCloud);
  passed('production upload fails closed without Cloudinary; no filesystem fallback');
  await db.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=$1', [fixture.id]);
  const revoked = await request('/api/admin/uploads', { method: 'POST' });
  assert.equal(revoked.status, 401); privateResponse(revoked);
  passed('fresh database authorization rejects disabled account with existing JWT');
  await db.query('UPDATE "AdminUser" SET "isActive"=true WHERE id=$1', [fixture.id]);
  const logoutCsrf = await (await request('/api/auth/csrf')).json();
  const logout = await request('/api/auth/signout', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken: logoutCsrf.csrfToken, callbackUrl: '/admin/login' }) });
  assert.equal(logout.status, 302);
  assert.equal(await (await request('/api/auth/session')).json(), null);
  passed('real CSRF-protected signout clears session');
  fs.writeFileSync('.local/workers-smoke/results.json', JSON.stringify({ passed: results, failed: 0 }, null, 2));
} finally {
  await db.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=$1', [fixture.id]);
  await db.end();
}
