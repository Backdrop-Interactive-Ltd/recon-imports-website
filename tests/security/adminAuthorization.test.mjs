import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHarness } from './moduleHarness.mjs';

const modulePath = file => path.resolve(file);
const actionDirectory = 'app/admin/(dashboard)';
const initialAccount = () => ({ id: 'actor', name: 'Test Admin', email: 'admin@example.invalid', role: 'SUPER_ADMIN', isActive: true });
const initialState = { status: 'idle', message: '' };

async function fixture() {
  let session = { user: { id: 'actor', role: 'SUPER_ADMIN' } };
  let account = initialAccount();
  let unavailable = false;
  let writes = 0;
  const records = new Map([['actor', account]]);
  let mutex = Promise.resolve();
  const adminUser = {
    findUnique: async ({ where }) => {
      if (unavailable) throw new Error('Database details must not leak');
      return records.get(where.id) ?? null;
    },
    count: async () => [...records.values()].filter(a => a.isActive && a.role === 'SUPER_ADMIN').length,
    create: async ({ data }) => { writes++; records.set(data.id ?? 'created', { id: 'created', ...data }); return data; },
    update: async ({ where, data }) => {
      if (!records.has(where.id)) throw new Error('Missing test fixture');
      writes++; Object.assign(records.get(where.id), data); return records.get(where.id);
    },
    delete: async ({ where }) => { writes++; records.delete(where.id); },
  };
  const prisma = {
    adminUser,
    media: { create: async () => { writes++; return { id: 'media' }; }, delete: async () => { writes++; }, findUnique: async () => ({ id: 'media' }) },
    car: { findUnique: async () => ({ id: 'car' }), update: async () => { writes++; }, delete: async () => { writes++; } },
    siteSetting: { upsert: args => async () => { writes++; return args; } },
    $transaction: async (operation) => {
      if (Array.isArray(operation)) return Promise.all(operation.map(fn => fn()));
      let release;
      const previous = mutex;
      mutex = new Promise(resolve => { release = resolve; });
      await previous;
      const snapshot = structuredClone([...records]);
      try { return await operation({ ...prisma, $executeRaw: async () => {} }); }
      catch (error) { records.clear(); for (const [id, value] of snapshot) records.set(id, value); throw error; }
      finally { release(); }
    },
  };
  class PrismaError extends Error {}
  const load = createHarness({
    [modulePath('lib/auth.ts')]: { auth: async () => session, signOut: async () => {} },
    [modulePath('lib/prisma.ts')]: { prisma },
    [modulePath('lib/generated/prisma/client.ts')]: { Prisma: { PrismaClientKnownRequestError: PrismaError } },
    'next/navigation': { redirect: location => { throw Object.assign(new Error('Redirect'), { location }); }, notFound: () => { throw new Error('Not found'); }, usePathname: () => '/admin' },
    'next/cache': { revalidatePath: () => {} },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    [modulePath('lib/uploads/cloudinary.ts')]: {
      getCloudinaryConfig: () => ({}), configureCloudinary: () => true,
      uploadImageBuffer: async () => ({ public_id: 'test-image', secure_url: 'https://example.invalid/image.png' }),
      getUploadedImageDeliveryUrl: result => result.secure_url,
    },
  });
  return { load, records, prisma, setSession: value => { session = value; }, setAccount: value => { account = value; records.delete('actor'); if (value) records.set('actor', value); }, setUnavailable: value => { unavailable = value; }, get writes() { return writes; } };
}

test('current-admin resolution: no/malformed session, missing/disabled/invalid-role account, active projection, outage', async () => {
  const f = await fixture();
  const auth = await f.load('lib/adminAuthorization.ts');
  for (const session of [null, {}, { user: {} }, { user: { id: 42 } }, { user: { id: ' ' } }]) {
    f.setSession(session); assert.equal(await auth.getCurrentAdmin(), null);
  }
  f.setSession({ user: { id: 'actor', role: 'SUPER_ADMIN' } });
  for (const account of [null, { ...initialAccount(), isActive: false }, { ...initialAccount(), role: 'OWNER' }]) {
    f.setAccount(account); assert.equal(await auth.getCurrentAdmin(), null);
  }
  f.setAccount({ ...initialAccount(), passwordHash: 'must-not-be-returned' });
  assert.deepEqual(Object.keys(await auth.getCurrentAdmin()).sort(), ['email','id','name','role']);
  f.setUnavailable(true);
  await assert.rejects(auth.requireAdminPermission('dashboard.access'), error => error.code === 'UNAVAILABLE' && !error.message.includes('Database details'));
});

test('permission matrix denies unknown values and implements restricted employee permissions', async () => {
  const f = await fixture(); const policy = await f.load('lib/adminPermissions.ts');
  for (const permission of policy.adminPermissions) assert.equal(policy.hasAdminPermission('SUPER_ADMIN', permission), true);
  for (const permission of ['employees.records.read','employees.draft.create','employees.draft.edit','employees.revisions.submit']) assert.equal(policy.hasAdminPermission('ADMIN', permission), true);
  for (const permission of ['employees.revisions.approve','employees.directory.publish','employees.verification.publish','employees.verification.status.manage','employees.identities.issue','employees.identities.retire','employees.qr.export','employees.policy.manage','employees.restricted.read','adminUsers.manage']) assert.equal(policy.hasAdminPermission('ADMIN', permission), false);
  for (const permission of policy.adminPermissions.filter(p => p.startsWith('employees.'))) assert.equal(policy.hasAdminPermission('EDITOR', permission), permission === 'employees.approved.read');
  for (const role of [undefined,null,'OWNER','__proto__','super_admin']) assert.equal(policy.hasAdminPermission(role,'dashboard.access'), false);
  assert.equal(policy.hasAdminPermission('SUPER_ADMIN', 'unknown.permission'), false);
});

test('all privileged Server Action exports reject unauthorized direct invocation before mutation', async () => {
  const f = await fixture(); let checked = 0;
  for (const entry of await fs.readdir(actionDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const filename = `${actionDirectory}/${entry.name}/actions.ts`;
    try { await fs.access(filename); } catch { continue; }
    const actions = await f.load(filename);
    for (const [name, action] of Object.entries(actions)) {
      if (typeof action !== 'function') continue;
      for (const state of ['anonymous','malformed','deleted','disabled','outage']) {
        f.setSession(state === 'anonymous' ? null : state === 'malformed' ? { user: { role: 'SUPER_ADMIN' } } : { user: { id: 'actor', role: 'SUPER_ADMIN' } });
        f.setAccount(state === 'deleted' ? null : { ...initialAccount(), isActive: state !== 'disabled' });
        f.setUnavailable(state === 'outage');
        await assert.rejects(action(), error => ['UNAUTHENTICATED','UNAVAILABLE'].includes(error.code), `${name}: ${state}`);
        assert.equal(f.writes, 0);
      }
      checked++;
    }
  }
  assert.equal(checked, 36, 'Update inventory when privileged actions change');
});

test('all account actions deny ADMIN/EDITOR, including stale SUPER_ADMIN JWT and client-supplied role', async () => {
  const f = await fixture(); const actions = await f.load(`${actionDirectory}/users/actions.ts`);
  const form = new FormData(); form.set('role','SUPER_ADMIN'); form.set('id','actor');
  for (const role of ['ADMIN','EDITOR']) {
    f.setAccount({ ...initialAccount(), role });
    for (const action of Object.values(actions)) await assert.rejects(action(initialState, form), error => error.code === 'FORBIDDEN');
  }
  assert.equal(f.writes, 0);
});

test('role downgrade, deactivation and deletion take effect with the same existing session', async () => {
  const f = await fixture(); const auth = await f.load('lib/adminAuthorization.ts');
  assert.equal((await auth.requireAdminPermission('adminUsers.manage')).role,'SUPER_ADMIN');
  f.setAccount({ ...initialAccount(), role: 'ADMIN' });
  await assert.rejects(auth.requireAdminPermission('adminUsers.manage'), error => error.code === 'FORBIDDEN');
  assert.equal((await auth.requireAdminPermission('inventory.manage')).role, 'ADMIN');
  f.setAccount({ ...initialAccount(), isActive: false });
  await assert.rejects(auth.requireAdminPermission('inventory.manage'), error => error.code === 'UNAUTHENTICATED');
  f.setAccount(null);
  await assert.rejects(auth.requireAdminPermission('inventory.manage'), error => error.code === 'UNAUTHENTICATED');
});

test('authorized account actions preserve validation, CRUD and self protections', async () => {
  const f = await fixture(); const actions = await f.load(`${actionDirectory}/users/actions.ts`);
  const form = new FormData();
  assert.equal((await actions.createAdminUserAction(initialState,form)).status,'error');
  form.set('name','Test Fixture'); form.set('email','fixture@example.invalid'); form.set('password','test-fixture-password'); form.set('role','ADMIN'); form.set('isActive','on');
  assert.equal((await actions.createAdminUserAction(initialState,form)).status,'success');
  form.set('id','created'); form.set('name','Updated Fixture'); form.set('password','');
  assert.equal((await actions.updateAdminUserAction(initialState,form)).status,'success');
  assert.equal(f.records.get('created').name,'Updated Fixture');
  assert.equal((await actions.setAdminUserActiveAction('created',false)).status,'success');
  assert.equal((await actions.setAdminUserActiveAction('created',true)).status,'success');
  assert.equal((await actions.deleteAdminUserAction('created')).status,'success');
  assert.equal((await actions.deleteAdminUserAction('actor')).status,'error');
  assert.equal((await actions.setAdminUserActiveAction('actor',false)).status,'error');
  form.set('id','actor'); form.set('role','ADMIN');
  assert.equal((await actions.updateAdminUserAction(initialState,form)).status,'error');
  assert.equal(f.records.get('actor').role,'SUPER_ADMIN', 'last-super demotion rolled back');
  form.delete('isActive');
  assert.equal((await actions.updateAdminUserAction(initialState,form)).status,'error');
});

test('account transaction serializes conflicting demotions, rolls back last-super removal and rechecks actor', async () => {
  const f = await fixture(); const safety = await f.load('lib/adminAccountSafety.ts');
  f.records.set('second',{ ...initialAccount(), id:'second' });
  const results = await Promise.allSettled(['actor','second'].map(id => safety.withAdminAccountMutation(id, tx => tx.adminUser.update({ where: { id }, data: { role: 'ADMIN' } }))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await f.prisma.adminUser.count(),1);
  const survivor=[...f.records.values()].find(a => a.role === 'SUPER_ADMIN');
  for (const operation of [tx => tx.adminUser.delete({ where: { id: survivor.id } }), tx => tx.adminUser.update({ where: { id: survivor.id }, data: { isActive:false } })]) {
    await assert.rejects(safety.withAdminAccountMutation(survivor.id,operation), /At least one active/);
    assert.equal(await f.prisma.adminUser.count(),1);
  }
  f.setAccount({ ...initialAccount(), role:'EDITOR' });
  await assert.rejects(safety.withAdminAccountMutation('actor', async () => { throw Error('must not execute'); }), error => error.code === 'FORBIDDEN');
});

test('active roles retain inventory, media, settings and upload workflows; upload rejects stale accounts', async () => {
  const f = await fixture();
  const cars=await f.load(`${actionDirectory}/cars/actions.ts`);
  const media=await f.load(`${actionDirectory}/media/actions.ts`);
  const settings=await f.load(`${actionDirectory}/site-settings/actions.ts`);
  const config=await f.load('lib/siteSettingsConfig.ts');
  const uploads=await f.load('app/api/admin/uploads/route.ts');
  for (const role of ['SUPER_ADMIN','ADMIN','EDITOR']) {
    f.setAccount({ ...initialAccount(), role });
    assert.equal((await cars.setCarPublishedAction('car',true)).status,'success');
    assert.equal((await media.deleteMediaRecordAction('media')).status,'success');
    const form = new FormData();
    for (const [key,value] of Object.entries(config.fallbackSiteSettings)) form.set(key,value);
    assert.equal((await settings.updateSiteSettingsAction(initialState,form)).status,'success');
    const uploadForm=new FormData(); uploadForm.set('file',new File([Buffer.from('test')],'portrait.png',{ type:'image/png' }));
    const response=await uploads.POST(new Request('http://localhost/api/admin/uploads',{ method:'POST',body:uploadForm }));
    assert.equal(response.status,200); assert.equal((await response.json()).mediaId,'media');
  }
  for (const state of ['anonymous','deleted','disabled','outage']) {
    f.setSession(state === 'anonymous' ? null : { user:{ id:'actor',role:'SUPER_ADMIN' } });
    f.setAccount(state === 'deleted' ? null : { ...initialAccount(),isActive:state !== 'disabled' });
    f.setUnavailable(state === 'outage');
    const response=await uploads.POST({ formData: () => { throw Error('must not process upload'); } });
    assert.equal(response.status,state === 'outage' ? 503 : 401);
  }
});

test('every dashboard page guards before executing its body; account navigation is permission-aware', async () => {
  const ts = (await import('typescript')).default;
  const files=[];
  async function walk(directory) { for (const entry of await fs.readdir(directory,{ withFileTypes:true })) { const file=path.join(directory,entry.name); if(entry.isDirectory()) await walk(file); else if(entry.name === 'page.tsx') files.push(file); } }
  await walk(actionDirectory);
  for (const file of files) {
    const source=await fs.readFile(file,'utf8'); const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const fn=parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword));
    assert.match(fn.body.statements[0].getText(parsed),/await requireAdminPagePermission\(/,file);
  }
  assert.equal(files.length,19);
  const f=await fixture(); const auth=await f.load('lib/adminAuthorization.ts');
  f.setSession(null);
  await assert.rejects(auth.requireAdminPagePermission('dashboard.access'), e => e.location === '/admin/login');
  f.setSession({ user:{id:'actor',role:'SUPER_ADMIN'} }); f.setAccount({...initialAccount(),role:'ADMIN'});
  await assert.rejects(auth.requireAdminPagePermission('adminUsers.manage'), e => e.location === '/admin');
  const source=await fs.readFile(`${actionDirectory}/AdminNav.tsx`,'utf8');
  assert.match(source,/hasAdminPermission\(role, "adminUsers.manage"\)/);
  assert.match(source,/hasAdminPermission\(role, "employees.records.read"\)/);
});
