import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Exercise the real React Server Component cache dispatcher, never a mock cache.
if (!process.execArgv.includes('--conditions=react-server')) {
  test('request deduplication and isolation under the real React server renderer', () => {
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--conditions=react-server', '--experimental-vm-modules', '--test', fileURLToPath(import.meta.url)], {
      encoding: 'utf8', windowsHide: true, timeout: 60000, env,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /same render deduplicates/, 'Child must actually execute the RSC tests');
    process.stdout.write(result.stdout);
  });
} else {
  const React = await import('react');
  const { renderToReadableStream } = await import('next/dist/compiled/react-server-dom-webpack/server.node.js');
  const { AsyncLocalStorage } = await import('node:async_hooks');
  const path = await import('node:path');
  const { createHarness } = await import('./moduleHarness.mjs');
  const scope = new AsyncLocalStorage();
  const initial = (id = 'synthetic-admin') => ({
    account: { id, name: 'Synthetic Admin', email: 'synthetic@example.invalid', role: 'SUPER_ADMIN', isActive: true },
    siteName: 'Synthetic site', unavailable: false,
    counts: { session: 0, account: 0, settings: 0, transactions: 0, lockedActor: 0 },
  });
  const fixture = () => { const value = scope.getStore(); assert.ok(value, 'No request fixture'); return value; };
  const accountRead = async transaction => {
    const f = fixture(); f.counts[transaction ? 'lockedActor' : 'account']++;
    if (f.unavailable) throw Error('Synthetic database unavailable');
    return f.account ? { ...f.account } : null;
  };
  const employee = { id: 'synthetic-employee', employeeCode: 'RI-EMP-101', employmentStatus: 'ACTIVE', version: 1, publicationEpoch: 1, archivedAt: null, personalDataErasedAt: null };
  const tx = {
    $executeRaw: async () => {}, $queryRaw: async () => [],
    adminUser: { findUnique: () => accountRead(true) },
    employee: { findUnique: async () => ({ ...employee }) },
    employeePublicProfile: { findMany: async () => [], count: async () => 0 },
    department: { findMany: async () => [] },
    employeePublicationApproval: { findMany: async () => [], count: async () => 0 },
    employeeAuditEvent: { findMany: async () => [], count: async () => 0 },
  };
  const load = createHarness({
    react: React,
    'next/navigation': { redirect: location => { throw Object.assign(Error('Redirect'), { location }); } },
    [path.resolve('lib/auth.ts')]: { auth: async () => { const f = fixture(); f.counts.session++; return { user: { id: f.account?.id ?? 'deleted', role: 'SUPER_ADMIN' } }; } },
    [path.resolve('lib/prisma.ts')]: { prisma: {
      adminUser: { findUnique: () => accountRead(false) },
      siteSetting: { findMany: async () => {
        const f = fixture(); f.counts.settings++; if (f.unavailable) throw Error('Synthetic unavailable');
        return [{ key: 'siteName', value: f.siteName }];
      } },
      $transaction: async operation => { fixture().counts.transactions++; return operation(tx); },
    } },
    [path.resolve('lib/generated/prisma/client.ts')]: { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
  }, { console: { ...console, error: () => {} } });
  const auth = await load('lib/adminAuthorization.ts');
  const settings = await load('lib/siteSettings.ts');
  const queries = await load('lib/employees/adminQueries.ts');

  async function render(f, operation) {
    return scope.run(f, async () => {
      let caught;
      async function Component() { await operation(); return React.createElement('div', null, 'Synthetic render'); }
      const stream = await renderToReadableStream(React.createElement(Component), {}, { onError: error => { caught = error; return 'SYNTHETIC_TEST_ERROR'; } });
      await new Response(stream).text(); if (caught) throw caught;
    });
  }

  test('same render deduplicates session/admin lookup and four layout/metadata/page settings reads', async () => {
    const f = initial();
    await render(f, async () => {
      const results = await Promise.all([
        auth.requireAdminPagePermission('dashboard.access'), auth.requireAdminPagePermission('employees.records.read'),
        auth.requireAdminRenderPermission('employees.records.read'), auth.requireAdminRenderPermission('employees.restricted.read'),
        ...Array.from({ length: 4 }, () => settings.getSiteSettings()),
      ]);
      assert.equal(results[0].id, f.account.id); assert.equal(results[4].siteName, f.siteName);
    });
    assert.equal(f.counts.session, 1); assert.equal(f.counts.account, 1); assert.equal(f.counts.settings, 1);
  });

  test('actual employee editor/review reads share render authorization but retain fresh locked actor checks', async () => {
    const f = initial();
    await render(f, async () => {
      await auth.requireAdminPagePermission('dashboard.access');
      await auth.requireAdminPagePermission('employees.records.read');
      await queries.getEmployeeEditorData('RI-EMP-101');
      await queries.getEmployeeReviewData('RI-EMP-101');
    });
    assert.equal(f.counts.session, 1); assert.equal(f.counts.account, 1);
    assert.equal(f.counts.transactions, 2); assert.equal(f.counts.lockedActor, 2);
  });

  test('sequential and concurrent server requests never share users or settings', async () => {
    const first = initial('first-admin'), second = initial('second-admin'); second.siteName = 'Second site';
    for (const f of [first, second]) await render(f, async () => {
      assert.equal((await auth.requireAdminRenderPermission('dashboard.access')).id, f.account.id);
      assert.equal((await settings.getSiteSettings()).siteName, f.siteName);
    });
    const a = initial('concurrent-a'), b = initial('concurrent-b'); b.siteName = 'Concurrent B';
    await Promise.all([a, b].map(f => render(f, async () => {
      await Promise.resolve();
      assert.equal((await auth.requireAdminRenderPermission('dashboard.access')).id, f.account.id);
      assert.equal((await settings.getSiteSettings()).siteName, f.siteName);
    })));
    for (const f of [first, second, a, b]) assert.deepEqual([f.counts.session, f.counts.account, f.counts.settings], [1, 1, 1]);
  });

  test('next render observes role downgrade, deactivation and deletion despite unchanged session claims', async () => {
    const f = initial();
    await render(f, () => auth.requireAdminRenderPermission('employees.restricted.read'));
    f.account.role = 'ADMIN';
    await render(f, () => assert.rejects(auth.requireAdminRenderPermission('employees.restricted.read'), e => e.code === 'FORBIDDEN'));
    f.account.isActive = false;
    await render(f, () => assert.rejects(auth.requireAdminRenderPermission('dashboard.access'), e => e.code === 'UNAUTHENTICATED'));
    f.account = null;
    await render(f, () => assert.rejects(auth.requireAdminRenderPermission('dashboard.access'), e => e.code === 'UNAUTHENTICATED'));
    assert.equal(f.counts.account, 4);
  });

  test('mutation/API authorization stays fresh even inside a render with a cached administrator', async () => {
    const f = initial();
    await render(f, async () => {
      await auth.requireAdminRenderPermission('employees.restricted.read');
      f.account.role = 'ADMIN';
      await assert.rejects(auth.requireAdminPermission('employees.restricted.read'), e => e.code === 'FORBIDDEN');
      f.account.isActive = false;
      await assert.rejects(auth.requireAdminPermission('dashboard.access'), e => e.code === 'UNAUTHENTICATED');
    });
    assert.equal(f.counts.account, 3); assert.equal(f.counts.session, 3);
  });

  test('locked read rechecks deny deactivation/downgrade within an existing render snapshot', async () => {
    for (const change of [f => { f.account.role = 'ADMIN'; }, f => { f.account.isActive = false; }]) {
      const f = initial();
      await render(f, async () => {
        await auth.requireAdminRenderPermission('employees.restricted.read'); change(f);
        await assert.rejects(queries.getEmployeeReviewData('RI-EMP-101'), e => e.code === 'FORBIDDEN');
      });
      assert.equal(f.counts.lockedActor, 1);
    }
  });

  test('public fallback is render-scoped; admin settings reads never cache failures or post-save values', async () => {
    const f = initial(); f.unavailable = true;
    await render(f, async () => {
      const first = await settings.getSiteSettings(); assert.equal((await settings.getSiteSettings()).siteName, first.siteName);
      await assert.rejects(settings.getAdminSiteSettings(), /Saved settings could not be loaded/);
      f.unavailable = false; f.siteName = 'Recovered saved site';
      assert.equal((await settings.getAdminSiteSettings()).siteName, f.siteName);
      f.siteName = 'New saved value'; assert.equal((await settings.getAdminSiteSettings()).siteName, f.siteName);
    });
    assert.equal(f.counts.settings, 4);
    await render(f, async () => assert.equal((await settings.getSiteSettings()).siteName, 'New saved value'));
    assert.equal(f.counts.settings, 5);
  });


  test('read-only API lookup retains fresh authorization even after render authorization was deduplicated', async () => {
    const f = initial();
    await render(f, async () => {
      await auth.requireAdminRenderPermission('employees.records.read'); f.account.role = 'EDITOR';
      await assert.rejects(queries.getEmployeeByCode('RI-EMP-101'), e => e.code === 'FORBIDDEN');
    });
    assert.equal(f.counts.account, 2); assert.equal(f.counts.transactions, 0);
  });

  test('authorization failures stay fail-closed per render and recover on the next request', async () => {
    const f = initial(); f.unavailable = true;
    await render(f, async () => {
      for (let i = 0; i < 2; i++) await assert.rejects(auth.requireAdminRenderPermission('dashboard.access'), e => e.code === 'UNAVAILABLE');
    });
    assert.equal(f.counts.account, 1); f.unavailable = false;
    await render(f, async () => assert.equal((await auth.requireAdminRenderPermission('dashboard.access')).id, f.account.id));
    assert.equal(f.counts.account, 2);
  });


  test('synthetic RSC lookup benchmark reports before/after work counts and process CPU without an edge-speed claim', async () => {
    const operation = optimized => async () => {
      await Promise.all([
        ...Array.from({ length: 4 }, () => optimized ? auth.requireAdminRenderPermission('dashboard.access') : auth.requireAdminPermission('dashboard.access')),
        ...Array.from({ length: 4 }, () => optimized ? settings.getSiteSettings() : settings.getAdminSiteSettings()),
      ]);
    };
    for (let i = 0; i < 20; i++) for (const optimized of [false, true]) await render(initial(), operation(optimized));
    const samples = { before: [], after: [] }, requests = 300;
    for (let round = 0; round < 3; round++) for (const optimized of round % 2 ? [true, false] : [false, true]) {
      const f = initial(), start = process.cpuUsage();
      for (let i = 0; i < requests; i++) await render(f, operation(optimized));
      const cpu = process.cpuUsage(start);
      for (const key of ['session', 'account', 'settings']) assert.equal(f.counts[key], requests * (optimized ? 1 : 4));
      samples[optimized ? 'after' : 'before'].push(Number(((cpu.user + cpu.system) / 1000).toFixed(3)));
    }
    console.log(JSON.stringify({ benchmark: 'synthetic read-only lookup workload under real RSC', requestsPerSample: requests, samples: samples,
      beforeCallsPerRender: { session: 4, account: 4, settings: 4 }, afterCallsPerRender: { session: 1, account: 1, settings: 1 },
      units: 'Node process CPU milliseconds; mock session/database; not production or edge CPU' }));
  });


  test('consolidated initial page shares render identity and retains one fresh actor check without audit reads', async () => {
    const f = initial(), oldHistory = tx.employeeAuditEvent;
    tx.employeeAuditEvent = { findMany: async () => { throw Error('Initial render must not load history'); }, count: async () => { throw Error('Initial render must not count history'); } };
    try {
      await render(f, async () => {
        await auth.requireAdminPagePermission('dashboard.access'); await auth.requireAdminPagePermission('employees.records.read');
        const page = await queries.getEmployeePageData('RI-EMP-101'); assert.ok(page.review); assert.equal(page.actorRole, 'SUPER_ADMIN');
      });
    } finally { tx.employeeAuditEvent = oldHistory; }
    assert.equal(f.counts.session, 1); assert.equal(f.counts.account, 1); assert.equal(f.counts.transactions, 1); assert.equal(f.counts.lockedActor, 1);
  });

  test('synthetic editor loader benchmark compares previous two transactions with the consolidated initial read', async () => {
    const operation = optimized => async () => {
      await auth.requireAdminPagePermission('dashboard.access'); await auth.requireAdminPagePermission('employees.records.read');
      if (optimized) await queries.getEmployeePageData('RI-EMP-101');
      else { await queries.getEmployeeEditorData('RI-EMP-101'); await queries.getEmployeeReviewData('RI-EMP-101'); }
    };
    for (let i = 0; i < 15; i++) for (const optimized of [false, true]) await render(initial(), operation(optimized));
    const samples = { before: [], after: [] }, requests = 200;
    for (let round = 0; round < 3; round++) for (const optimized of round % 2 ? [true, false] : [false, true]) {
      const f = initial(), start = process.cpuUsage();
      for (let i = 0; i < requests; i++) await render(f, operation(optimized));
      const cpu = process.cpuUsage(start);
      assert.equal(f.counts.transactions, requests * (optimized ? 1 : 2)); assert.equal(f.counts.lockedActor, requests * (optimized ? 1 : 2));
      samples[optimized ? 'after' : 'before'].push((cpu.user + cpu.system) / 1000);
    }
    console.log(JSON.stringify({ benchmark: 'editor/review loader CPU; real RSC; mocked database; Node CPU milliseconds, not Cloudflare', requestsPerSample: requests, samples }));
  });

  test('outside a React render the read helpers do not retain values', async () => {
    const f = initial();
    await scope.run(f, async () => {
      await auth.requireAdminRenderPermission('dashboard.access'); f.account.isActive = false;
      await assert.rejects(auth.requireAdminRenderPermission('dashboard.access'), e => e.code === 'UNAUTHENTICATED');
      assert.equal((await settings.getSiteSettings()).siteName, f.siteName);
      f.siteName = 'Later'; assert.equal((await settings.getSiteSettings()).siteName, 'Later');
    });
    assert.equal(f.counts.account, 2); assert.equal(f.counts.settings, 2);
  });
}
