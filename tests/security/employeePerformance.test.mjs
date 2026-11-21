import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { NextResponse } from 'next/server.js';
import { createHarness } from './moduleHarness.mjs';

async function fixture() {
  const state = { role: 'SUPER_ADMIN', active: true, lockedRole: null, lockedActive: true, employeeStatus: 'ACTIVE', erased: false, counts: { transactions: 0, actor: 0, employee: 0, history: 0, historyCount: 0, approvals: 0 }, pages: [] };
  const tx = {
    $executeRaw: async () => {}, $queryRaw: async () => [],
    adminUser: { findUnique: async () => { state.counts.actor++; return { role: state.lockedRole ?? state.role, isActive: state.lockedActive }; } },
    employee: { findUnique: async () => { state.counts.employee++; return { id: 'employee', employeeCode: 'RI-EMP-101', version: 1, publicationEpoch: 2, employmentStatus: state.employeeStatus, archivedAt: null, personalDataErasedAt: state.erased ? new Date() : null }; } },
    employeePublicProfile: { findMany: async () => [], count: async () => 0 }, department: { findMany: async () => [] },
    employeePublicationApproval: { findMany: async () => { state.counts.approvals++; return []; }, count: async () => 0 },
    employeeAuditEvent: { findMany: async args => { state.counts.history++; state.pages.push(args); return [{ id: 'audit', eventType: 'CREATED', actorRole: 'SUPER_ADMIN', recordVersion: 1, profileRevision: 1, changedFields: ['employeeCode'], isSelfApproval: false, createdAt: new Date('2026-01-01') }]; }, count: async () => { state.counts.historyCount++; return 45; } },
  };
  const load = createHarness({
    'next/navigation': { redirect: location => { throw Object.assign(Error('Redirect'), { location }); } },
    [path.resolve('lib/auth.ts')]: { auth: async () => ({ user: { id: 'actor', role: 'SUPER_ADMIN' } }) },
    [path.resolve('lib/prisma.ts')]: { prisma: {
      adminUser: { findUnique: async () => ({ id: 'actor', role: state.role, isActive: state.active }) },
      $transaction: async callback => { state.counts.transactions++; return callback(tx); },
    } },
    [path.resolve('lib/generated/prisma/client.ts')]: { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
  });
  return { state, queries: await load('lib/employees/adminQueries.ts') };
}

test('initial SUPER_ADMIN page uses one actor transaction and employee lookup, no history query/count', async () => {
  const f = await fixture(); const result = await f.queries.getEmployeePageData('RI-EMP-101');
  assert.equal(result.actorRole, 'SUPER_ADMIN'); assert.ok(result.review);
  assert.deepEqual(f.state.counts, { transactions: 1, actor: 1, employee: 1, history: 0, historyCount: 0, approvals: 1 });
  assert.ok(!('history' in result.review));
});

test('consolidated reader gates private review using the freshly locked role and denies disabled actors', async () => {
  const f = await fixture(); f.state.lockedRole = 'ADMIN';
  const result = await f.queries.getEmployeePageData('RI-EMP-101');
  assert.equal(result.actorRole, 'ADMIN'); assert.equal(result.review, null); assert.equal(f.state.counts.approvals, 0);
  for (const update of [{ lockedRole: 'EDITOR' }, { lockedRole: 'SUPER_ADMIN', lockedActive: false }]) {
    const f = await fixture(); Object.assign(f.state, update);
    await assert.rejects(f.queries.getEmployeePageData('RI-EMP-101'), e => e.code === 'FORBIDDEN'); assert.equal(f.state.counts.employee, 0);
  }
});

test('history is explicitly requested, freshly authorized, bounded and accessible across pages', async () => {
  const f = await fixture(); const data = await f.queries.getEmployeeHistoryData('RI-EMP-101', 2);
  assert.equal(data.historyCount, 45); assert.equal(data.history[0].eventType, 'CREATED');
  assert.equal(f.state.pages[0].take, 20); assert.equal(f.state.pages[0].skip, 20);
  assert.deepEqual(JSON.parse(JSON.stringify(f.state.pages[0].where)), { employeeId: 'employee' });
  await f.queries.getEmployeeHistoryData('RI-EMP-101', 3); assert.equal(f.state.pages[1].skip, 40);
  await assert.rejects(f.queries.getEmployeeHistoryData('RI-EMP-101', 10001), e => e.code === 'VALIDATION');
  for (const role of ['ADMIN', 'EDITOR']) { f.state.role = role; await assert.rejects(f.queries.getEmployeeHistoryData('RI-EMP-101'), e => e.code === 'FORBIDDEN'); }
  f.state.role = 'SUPER_ADMIN'; f.state.active = false;
  await assert.rejects(f.queries.getEmployeeHistoryData('RI-EMP-101'), e => e.code === 'UNAUTHENTICATED');
});

test('history access rechecks an actor downgraded/deactivated between authorization and its transaction', async () => {
  for (const update of [{ lockedRole: 'ADMIN' }, { lockedActive: false }]) {
    const f = await fixture(); Object.assign(f.state, update);
    await assert.rejects(f.queries.getEmployeeHistoryData('RI-EMP-101'), e => e.code === 'FORBIDDEN'); assert.equal(f.state.counts.history, 0);
  }
  const f = await fixture(); f.state.employeeStatus = 'INACTIVE';
  assert.equal((await f.queries.getEmployeeHistoryData('RI-EMP-101')).historyCount, 45, 'Employee deactivation never erases authorized history');
});

async function qrFixture() {
  const state = { authorized: true, exists: true, erased: false, employeeStatus: 'ACTIVE', reads: 0, generated: 0 };
  class AuthError extends Error { constructor(code) { super(code); this.code = code; } }
  const load = createHarness({
    'next/server': { NextResponse },
    [path.resolve('lib/adminAuthorization.ts')]: { AdminAuthorizationError: AuthError, requireAdminPermission: async permission => { assert.equal(permission, 'employees.qr.export'); if (!state.authorized) throw new AuthError('FORBIDDEN'); } },
    [path.resolve('lib/employees/adminQueries.ts')]: { getEmployeeByCode: async () => { state.reads++; return state.exists ? { employeeCode: 'RI-EMP-101', personalDataErasedAt: state.erased ? new Date() : null, employmentStatus: state.employeeStatus } : null; } },
    qrcode: { default: { toBuffer: async () => { state.generated++; return Buffer.from('synthetic-png'); } } },
  }, { Request, Response, Headers, Uint8Array });
  const module = await load('app/api/admin/employees/[employeeCode]/qr/route.ts');
  const get = etag => module.GET(new Request('http://localhost:3000/api/admin/employees/RI-EMP-101/qr', { headers: etag ? { 'If-None-Match': etag } : {} }), { params: Promise.resolve({ employeeCode: 'RI-EMP-101' }) });
  return { state, get };
}

test('QR validator avoids identical encoding only after fresh authorization and employee checks', async () => {
  const f = await qrFixture(); const first = await f.get(); assert.equal(first.status, 200);
  const etag = first.headers.get('ETag'); assert.ok(etag);
  const second = await f.get(etag); assert.equal(second.status, 304); assert.equal(f.state.generated, 1); assert.equal(f.state.reads, 2);
  assert.match(second.headers.get('Cache-Control'), /no-store/);
  f.state.authorized = false; assert.equal((await f.get(etag)).status, 403); assert.equal(f.state.generated, 1);
  f.state.authorized = true; f.state.erased = true; assert.equal((await f.get(etag)).status, 404);
  f.state.erased = false; f.state.exists = false; assert.equal((await f.get(etag)).status, 404);
});

test('inactive/resigned employees retain the same identity QR while mismatched validators require new pixels', async () => {
  const f = await qrFixture(); const first = await f.get(); const etag = first.headers.get('ETag');
  for (const status of ['INACTIVE', 'RESIGNED']) { f.state.employeeStatus = status; assert.equal((await f.get(etag)).status, 304); }
  assert.equal((await f.get('"different-image"')).status, 200); assert.equal(f.state.generated, 2);
});

test('dedicated history page renders authorized paginated events and denies other roles before loading', async () => {
  const React = await import('react'); const { renderToStaticMarkup } = await import('react-dom/server');
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'EDITOR']) {
    const f = await fixture(); f.state.role = role;
    const load = createHarness({
      'next/link': { default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) },
      'next/navigation': { notFound: () => { throw Error('NOT_FOUND'); } },
      [path.resolve('lib/adminAuthorization.ts')]: { requireAdminPagePermission: async permission => { assert.equal(permission, 'employees.restricted.read'); if (role !== 'SUPER_ADMIN') throw Error('DENIED'); } },
      [path.resolve('lib/employees/adminQueries.ts')]: f.queries,
      [path.resolve('app/admin/(dashboard)/employees/page.module.css')]: { default: {} },
    });
    const page = await load('app/admin/(dashboard)/employees/[employeeCode]/history/page.tsx');
    const render = () => page.default({ params: Promise.resolve({ employeeCode: 'RI-EMP-101' }), searchParams: Promise.resolve({ page: '2' }) });
    if (role !== 'SUPER_ADMIN') { await assert.rejects(render(), /DENIED/); assert.equal(f.state.counts.history, 0); }
    else { const html = renderToStaticMarkup(await render()); assert.match(html, /CREATED/); assert.match(html, /history\?page=1/); assert.match(html, /history\?page=3/); assert.match(html, /45 events retained/); }
  }
});

test('synthetic QR request benchmark measures avoided encoding with fresh authorization on every request', async () => {
  const { default: QRCode } = await import('qrcode');
  class AuthError extends Error {}
  async function run(conditional) {
    let generated = 0, authorized = 0, employeeReads = 0;
    const load = createHarness({
      'next/server': { NextResponse },
      [path.resolve('lib/adminAuthorization.ts')]: { AdminAuthorizationError: AuthError, requireAdminPermission: async () => { authorized++; } },
      [path.resolve('lib/employees/adminQueries.ts')]: { getEmployeeByCode: async () => { employeeReads++; return { employeeCode: 'RI-EMP-101', personalDataErasedAt: null }; } },
      qrcode: { default: { toBuffer: async (...args) => { generated++; return QRCode.toBuffer(...args); } } },
    }, { Request, Response, Headers, Uint8Array });
    const route = await load('app/api/admin/employees/[employeeCode]/qr/route.ts');
    const get = validator => route.GET(new Request('http://localhost:3000/qr', { headers: validator ? { 'If-None-Match': validator } : {} }), { params: Promise.resolve({ employeeCode: 'RI-EMP-101' }) });
    await get(); generated = 0; authorized = 0; employeeReads = 0;
    let etag; const start = process.cpuUsage();
    for (let i = 0; i < 20; i++) { const response = await get(conditional ? etag : undefined); assert.equal(response.status, conditional && i > 0 ? 304 : 200); etag = response.headers.get('ETag'); }
    const cpu = process.cpuUsage(start);
    assert.equal(authorized, 20); assert.equal(employeeReads, 20); assert.equal(generated, conditional ? 1 : 20);
    return { cpuMs: (cpu.user + cpu.system) / 1000, generated, authorizationChecks: authorized, employeeChecks: employeeReads };
  }
  const before = await run(false), after = await run(true);
  console.log(JSON.stringify({ benchmark: '20 repeated QR requests; real PNG encoder; mocked authorization/database; Node process CPU, not Cloudflare', before, after }));
});
