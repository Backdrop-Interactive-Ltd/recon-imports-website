import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fixture } from './fixture.mjs';

const directory = 'app/admin/(dashboard)/employees';
const idle = { status: 'idle', message: '' };
const consent = () => ({ scope: 'DIRECTORY', consentReference: 'synthetic-private-consent', consentPolicyVersion: 'synthetic-v1', consentRecordedAt: new Date(Date.now() - 60000).toISOString().slice(0, 16) });
const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) { if (Array.isArray(value)) for (const entry of value) data.append(key, String(entry)); else data.set(key, String(value)); } return data; };
async function setup(overrides = {}, globals = {}) {
  const refreshes = [];
  const f = await fixture({ 'next/cache': { revalidatePath: (...args) => refreshes.push(args) }, 'next/navigation': { redirect: location => { throw Object.assign(new Error('Redirect'), { location }); }, notFound: () => { throw Error('Not found'); } }, ...overrides }, globals);
  const actions = await f.load(`${directory}/actions.ts`);
  const queries = await f.load('lib/employees/adminQueries.ts');
  const act = async (operation, employeeId, values = {}) => actions.employeeAction(idle, form({ operation, employeeId, expectedVersion: await f.version(employeeId), confirmed: 'on', ...values }));
  return { ...f, publicQueries: f.queries, actions, queries, act, refreshes };
}
const success = result => assert.equal(result.status, 'success', result.message);

test('real Admin actions create/edit/submit; SUPER_ADMIN activates, approves, publishes, resigns and rejoins the same identity', async () => {
  const f = await setup(); try {
    f.setSubject('eid_admin');
    const created = await f.actions.createEmployeeAction(idle, form({ internalName: 'Private EID-04 employee' }));
    success(created); assert.deepEqual(Object.keys(created).sort(), ['employeeCode', 'message', 'status']);
    const e = await f.prisma.employee.findUniqueOrThrow({ where: { employeeCode: created.employeeCode } });
    assert.equal(e.employmentStatus, 'INACTIVE');
    let p = (await f.queries.getEmployeeEditorData(e.employeeCode)).profiles[0];
    success(await f.act('saveDraft', e.id, { revision: p.revision, expectedProfileVersion: p.version, publicName: 'Approved UI name', designation: 'Advisor', displayOrder: 0, officialPhone: '+8801000000000', officialEmail: 'public@example.invalid', portraitStorageKey: 'must-be-ignored', role: 'SUPER_ADMIN' }));
    assert.equal((await f.prisma.employeePublicProfile.findUniqueOrThrow({ where: { id: p.id } })).portraitStorageKey, null);
    success(await f.act('submit', e.id, { revision: p.revision }));
    f.setSubject('eid_super'); success(await f.act('activate', e.id)); f.setSubject('eid_admin');
    for (const scope of ['DIRECTORY', 'VERIFICATION']) success(await f.act('requestApproval', e.id, { ...consent(), revision: p.revision, scope, ...(scope === 'DIRECTORY' ? { publishEmail: 'on' } : {}) }));
    assert.equal((await f.queries.getEmployeeEditorData(e.employeeCode)).profiles[0].state, 'SUBMITTED');
    await assert.rejects(f.queries.getEmployeeReviewData(e.employeeCode), error => error.code === 'FORBIDDEN');
    f.setSubject('eid_super');
    assert.equal((await f.queries.getEmployeeReviewData(e.employeeCode)).approvals.some(a => a.isPublished), false);
    for (const a of (await f.queries.getEmployeeReviewData(e.employeeCode)).approvals) {
      success(await f.act('approve', e.id, { approvalId: a.id }));
      success(await f.act('publish', e.id, { approvalId: a.id }));
    }
    const live = await f.publicQueries.getPublicEmployeeProfile(e.employeeCode);
    assert.equal(live.state, 'ACTIVE'); assert.equal(live.profile.publicName, 'Approved UI name'); assert.equal(live.profile.officialPhone, null); assert.equal(live.profile.officialEmail, null);
    assert.equal((await f.publicQueries.getPublicTeamMembers({ search: 'Approved UI name', pageSize: 50 })).find(x => x.employeeCode === e.employeeCode).officialEmail, 'public@example.invalid');
    success(await f.act('newDraft', e.id));
    const draft = (await f.queries.getEmployeeEditorData(e.employeeCode)).profiles[0];
    success(await f.act('saveDraft', e.id, { revision: draft.revision, expectedProfileVersion: draft.version, publicName: 'Unapproved replacement', designation: 'Private draft', displayOrder: 0 }));
    assert.equal((await f.publicQueries.getPublicEmployeeProfile(e.employeeCode)).profile.publicName, 'Approved UI name');
    success(await f.act('resign', e.id));
    assert.equal((await f.publicQueries.getPublicEmployeeProfile(e.employeeCode)).state, 'RESIGNED');
    assert.equal((await f.queries.listEmployeesForAdmin({ status: 'ARCHIVED', search: e.employeeCode }))[0].employeeCode, e.employeeCode);
    success(await f.act('rejoin', e.id));
    assert.equal((await f.publicQueries.getPublicEmployeeProfile(e.employeeCode)).profile.publicName, 'Approved UI name');
    assert.equal((await f.prisma.employee.findUniqueOrThrow({ where: { id: e.id } })).employeeCode, e.employeeCode);
    const review = await f.queries.getEmployeeReviewData(e.employeeCode);
    assert.ok(review.history.some(x => x.eventType === 'STATUS_CHANGED'));
    assert.ok(!JSON.stringify(review.history).includes('actorAdminId'));
    assert.ok(f.refreshes.length > 0);
  } finally { await f.close(); }
});

test('direct UI actions deny anonymous/EDITOR/deleted/disabled actors; ADMIN cannot invoke privileged operations', async () => {
  const f = await setup(); try {
    const e = await f.employee(); const before = await f.version(e.id);
    for (const subject of [null, 'missing', 'eid_editor']) {
      f.setSubject(subject);
      for (const action of Object.values(f.actions)) await assert.rejects(action(idle, form({ role: 'SUPER_ADMIN' })), error => ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.code));
    }
    f.setSubject('eid_admin');
    for (const operation of ['activate', 'resign', 'rejoin', 'approve', 'reject', 'publish', 'unpublish', 'withdrawConsent']) {
      const result = await f.act(operation, e.id, { approvalId: 'untrusted', consentReference: 'untrusted', role: 'SUPER_ADMIN', actorId: 'eid_super' });
      assert.equal(result.code, 'FORBIDDEN', operation);
    }
    assert.equal(await f.version(e.id), before);
    await f.owner.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=\'eid_admin\'');
    await assert.rejects(f.actions.createEmployeeAction(idle, form({})), error => error.code === 'UNAUTHENTICATED');
    await assert.rejects(f.queries.getEmployeeEditorData(e.employeeCode), error => error.code === 'UNAUTHENTICATED');
  } finally { await f.close(); }
});

test('draft immutability, stale versions, consent expiry/withdrawal and confirmations fail without partial writes', async () => {
  const f = await setup(); try {
    const e = await f.employee(); const p = await f.submitted(e.id);
    const version = await f.version(e.id);
    assert.equal((await f.act('saveDraft', e.id, { revision: p.revision, expectedProfileVersion: p.version, publicName: 'tamper', displayOrder: 0 })).code, 'INELIGIBLE');
    assert.equal((await f.act('resign', e.id, { confirmed: '' })).code, 'VALIDATION');
    assert.equal(await f.version(e.id), version);
    assert.equal((await f.act('resign', e.id, { expectedVersion: version - 1 })).code, 'CONFLICT');
    assert.equal((await f.act('requestApproval', e.id, { ...consent(), revision: p.revision, consentExpiresAt: '2000-01-01T00:00' })).code, 'CONSENT_EXPIRY_PAST');
    assert.equal((await f.act('requestApproval', e.id, { ...consent(), revision: p.revision, consentReference: '' })).code, 'CONSENT_REFERENCE_INVALID');
    const a = await f.approved(e.id, p.revision, 'VERIFICATION', { consentReference: 'synthetic-withdraw-ui' });
    success(await f.act('publish', e.id, { approvalId: a.id }));
    success(await f.act('resign', e.id));
    success(await f.act('withdrawConsent', e.id, { consentReference: 'synthetic-withdraw-ui' }));
    const resignedVersion = await f.version(e.id);
    assert.equal((await f.act('rejoin', e.id)).code, 'CONSENT_WITHDRAWN');
    assert.equal(await f.version(e.id), resignedVersion);
    assert.equal((await f.publicQueries.getPublicEmployeeProfile(e.employeeCode)).state, 'RESIGNED');
    success(await f.act('requestApproval', e.id, { ...consent(), revision: p.revision, scope: 'VERIFICATION', consentReference: 'synthetic-renewed-ui' }));
    const renewed = (await f.queries.getEmployeeReviewData(e.employeeCode)).approvals.find(x => x.consentReference === 'synthetic-renewed-ui');
    success(await f.act('approve', e.id, { approvalId: renewed.id }));
    success(await f.act('rejoin', e.id, { approvalIds: [renewed.id] }));
    assert.equal((await f.publicQueries.getPublicEmployeeProfile(e.employeeCode)).state, 'ACTIVE');
  } finally { await f.close(); }
});

test('editor queries are bounded and separate draft fields from restricted evidence/history; fresh role checks defeat downgrade races', async () => {
  const f = await setup(); try {
    const e = await f.employee(); const p = await f.submitted(e.id);
    await f.approved(e.id, p.revision, 'DIRECTORY', { consentReference: 'EID04-RESTRICTED-REFERENCE' });
    for (let i = 0; i < 6; i++) { const revision = await f.call('createDraftRevision', e.id, { fields: { publicName: 'Synthetic revision', designation: 'Synthetic title' } }); await f.call('submitEmployeeRevision', e.id, { revision: revision.revision }); }
    f.setSubject('eid_admin');
    const first = await f.queries.getEmployeeEditorData(e.employeeCode);
    assert.equal(first.profiles.length, 5); assert.equal(first.profileCount, 7);
    assert.equal((await f.queries.getEmployeeEditorData(e.employeeCode, 2)).profiles.length, 2);
    for (const forbidden of ['EID04-RESTRICTED-REFERENCE', 'consentReference', 'publicKey', 'createdById']) assert.ok(!JSON.stringify(first).includes(forbidden));
    await assert.rejects(f.queries.getEmployeeReviewData(e.employeeCode), error => error.code === 'FORBIDDEN');
    await assert.rejects(f.queries.getEmployeeEditorData(e.employeeCode, 0), error => error.code === 'VALIDATION');
    f.setSubject('eid_super');
    const review = await f.queries.getEmployeeReviewData(e.employeeCode);
    assert.equal(review.approvals[0].consentReference, 'EID04-RESTRICTED-REFERENCE'); assert.ok(review.history.length <= 20);
    const transaction = f.prisma.$transaction.bind(f.prisma);
    f.prisma.$transaction = async (...args) => { await f.owner.query('UPDATE "AdminUser" SET role=\'ADMIN\' WHERE id=\'eid_super\''); return transaction(...args); };
    await assert.rejects(f.queries.getEmployeeReviewData(e.employeeCode), error => error.code === 'FORBIDDEN');
  } finally { await f.close(); }
});

test('rendered detail screen protects consent/history/lifecycle controls by actual role', async () => {
  const f = await setup({
    'next/link': { default: ({ href, children }) => React.createElement('a', { href }, children) },
    [path.resolve(`${directory}/page.module.css`)]: { default: {} },
    [path.resolve(`${directory}/EmployeeForms.tsx`)]: { EmployeePhotoField: () => null, EmployeeActionForm: ({ operation, children }) => React.createElement('form', { 'data-op': operation }, children) },
    [path.resolve(`${directory}/EmployeeIdentityControls.tsx`)]: { default: () => null },
  }); try {
    const e = await f.employee(); const p = await f.submitted(e.id);
    await f.approved(e.id, p.revision, 'DIRECTORY', { consentReference: 'EID04-ONLY-SUPER-CONSENT' });
    const page = await f.load(`${directory}/[employeeCode]/page.tsx`);
    const props = { params: Promise.resolve({ employeeCode: e.employeeCode }), searchParams: Promise.resolve({}) };
    const superHtml = renderToStaticMarkup(await page.default(props));
    assert.ok(superHtml.includes('EID04-ONLY-SUPER-CONSENT')); assert.ok(superHtml.includes('View protected history')); assert.ok(superHtml.includes('data-op="resign"'));
    f.setSubject('eid_admin');
    const adminHtml = renderToStaticMarkup(await page.default(props));
    assert.ok(adminHtml.includes('Synthetic Public Name')); assert.ok(!adminHtml.includes('EID04-ONLY-SUPER-CONSENT')); assert.ok(!adminHtml.includes('Protected history')); assert.ok(!adminHtml.includes('data-op="publish"')); assert.ok(!adminHtml.includes('data-op="resign"'));
    f.setSubject('eid_editor'); await assert.rejects(page.default(props));
  } finally { await f.close(); }
});

test('UI reads and action results fail closed on a database outage without exposing errors', async () => {
  const f = await setup(); try {
    const e = await f.employee();
    f.prisma.$transaction = async () => { throw Error('PRIVATE SQL AND CONNECTION DETAILS'); };
    await assert.rejects(f.queries.getEmployeeEditorData(e.employeeCode), error => error.code === 'UNAVAILABLE' && !error.message.includes('PRIVATE'));
    await assert.rejects(f.queries.getEmployeeReviewData(e.employeeCode), error => error.code === 'UNAVAILABLE' && !error.message.includes('PRIVATE'));
    const result = await f.actions.createEmployeeAction(idle, form({ internalName: 'Outage test' }));
    assert.equal(result.code, 'UNAVAILABLE'); assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  } finally { await f.close(); }
});

test('combined page and deferred history use real transactions, bounded pages and fresh restricted authorization', async () => {
  const f = await setup(); try {
    const e = await f.employee();
    await f.submitted(e.id);
    for (let i = 0; i < 11; i++) {
      const draft = await f.call('createDraftRevision', e.id, { fields: {} });
      await f.call('saveEmployeeDraft', e.id, { revision: draft.revision, expectedProfileVersion: draft.version, fields: { publicName: 'Synthetic history', designation: 'Advisor' } });
      await f.call('submitEmployeeRevision', e.id, { revision: draft.revision });
    }
    const page = await f.queries.getEmployeePageData(e.employeeCode);
    assert.equal(page.actorRole, 'SUPER_ADMIN');
    assert.ok(page.review);
    assert.equal(Object.hasOwn(page.review, 'history'), false);
    const first = await f.queries.getEmployeeHistoryData(e.employeeCode, 1);
    const second = await f.queries.getEmployeeHistoryData(e.employeeCode, 2);
    assert.equal(first.history.length, 20);
    assert.ok(second.history.length > 0);
    assert.equal(first.historyCount, second.historyCount);
    assert.ok(second.history.every(row => !first.history.some(previous => previous.id === row.id)));
    assert.ok(!JSON.stringify(first).includes('actorAdminId'));
    await assert.rejects(f.queries.getEmployeeHistoryData(e.employeeCode, 0), error => error.code === 'VALIDATION');
    await f.owner.query('UPDATE "AdminUser" SET role=\'ADMIN\' WHERE id=\'eid_super\'');
    assert.equal((await f.queries.getEmployeePageData(e.employeeCode)).review, null);
    await assert.rejects(f.queries.getEmployeeHistoryData(e.employeeCode), error => error.code === 'FORBIDDEN');
    await f.owner.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=\'eid_super\'');
    await assert.rejects(f.queries.getEmployeePageData(e.employeeCode), error => error.code === 'UNAUTHENTICATED');
    await assert.rejects(f.queries.getEmployeeHistoryData(e.employeeCode), error => error.code === 'UNAUTHENTICATED');
  } finally { await f.close(); }
});

test('QR conditional responses retain live database authorization for unpublished and resigned employees', async () => {
  const { NextResponse } = await import('next/server.js');
  const f = await setup({ 'next/server': { NextResponse } }, { Response, Request, Headers, Uint8Array }); try {
    const e = await f.employee();
    const route = await f.load('app/api/admin/employees/[employeeCode]/qr/route.ts');
    const params = { params: Promise.resolve({ employeeCode: e.employeeCode }) };
    const url = `http://localhost/api/admin/employees/${e.employeeCode}/qr`;
    const response = await route.GET(new Request(url), params);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'image/png');
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 8)], [137,80,78,71,13,10,26,10]);
    const etag = response.headers.get('ETag');
    const conditional = () => route.GET(new Request(url, { headers: { 'If-None-Match': etag } }), params);
    assert.equal((await conditional()).status, 304);
    await f.call('resignEmployee', e.id);
    assert.equal((await conditional()).status, 304);
    await f.owner.query('UPDATE "AdminUser" SET role=\'ADMIN\' WHERE id=\'eid_super\'');
    assert.equal((await conditional()).status, 403);
    await f.owner.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=\'eid_super\'');
    assert.equal((await conditional()).status, 401);
  } finally { await f.close(); }
});
