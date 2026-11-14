import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHarness } from './moduleHarness.mjs';

async function setup({ state = 'SUBMITTED', photo = true, denied = false } = {}) {
  const requests = [], events = [];
  const employee = { id: 'employee', version: 6, publicationEpoch: 2, archivedAt: null, personalDataErasedAt: null };
  const tx = {
    $executeRaw: async () => {}, $queryRaw: async () => [],
    adminUser: { findUnique: async () => ({ role: 'SUPER_ADMIN', isActive: true }) },
    employee: { findUnique: async () => employee, update: async () => ({ ...employee, version: 7 }) },
    employeePublicProfile: { findUnique: async ({ where }) => {
      assert.equal(where.employeeId_revision.revision, 1);
      return { revision: 1, state, erasedAt: null, portraitStorageKey: photo ? 'synthetic-photo' : null, portraitStorageVersion: photo ? '1' : null, officialPhone: 'synthetic', officialEmail: 'synthetic' };
    } },
    employeePublicationApproval: { create: async ({ data }) => { requests.push(data); return data; } },
    employeeAuditEvent: { create: async ({ data }) => events.push(data) },
  };
  class AuthError extends Error { constructor(code) { super(code); this.code = code; } }
  const load = createHarness({
    'next/cache': { revalidatePath: () => {} },
    [path.resolve('lib/prisma.ts')]: { prisma: { $transaction: async operation => operation(tx) } },
    [path.resolve('lib/generated/prisma/client.ts')]: { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
    [path.resolve('lib/adminAuthorization.ts')]: { AdminAuthorizationError: AuthError, requireAdminPermission: async () => { if (denied) throw new AuthError('FORBIDDEN'); return { id: 'actor', role: 'SUPER_ADMIN' }; } },
    [path.resolve('lib/employees/photoUpload.ts')]: { prepareEmployeePhoto: () => { throw Error('Must not upload'); } },
  });
  const actions = await load('app/admin/(dashboard)/employees/actions.ts');
  const form = overrides => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ operation: 'requestApproval', employeeId: 'employee', expectedVersion: '6', revision: '1', scope: 'DIRECTORY', consentReference: 'synthetic-evidence', consentPolicyVersion: 'v1', consentExpiresAt: '', publishPortrait: 'on', ...overrides })) data.set(key, value);
    return data;
  };
  return { submit: overrides => actions.employeeAction({}, form(overrides)), requests, events };
}

test('actual action and service accept submitted revision 1 with photo despite a separate empty draft; empty expiry stays null', async () => {
  const f = await setup(); const before = Date.now(); const result = await f.submit({}); const after = Date.now();
  assert.equal(result.status, 'success', result.message); assert.equal(f.requests.length, 1);
  const data = f.requests[0]; assert.equal(data.profileRevision, 1); assert.equal(data.employmentEpoch, 2);
  assert.ok(data.consentRecordedAt.getTime() >= before && data.consentRecordedAt.getTime() <= after); assert.equal(data.consentExpiresAt, null);
  assert.equal(data.publishPortrait, true); assert.equal(data.status, undefined); assert.equal(data.isPublished, undefined);
  assert.equal(f.events[0].eventType, 'APPROVAL_REQUESTED');
});

test('specific errors identify expired consent, missing fields and invalid expiry without creating requests', async () => {
  const cases = [
    [{ consentExpiresAt: '2026-01-02T00:00' }, 'CONSENT_EXPIRY_PAST'],
    [{ consentExpiresAt: 'invalid' }, 'CONSENT_EXPIRY_INVALID'],
    [{ consentReference: '   ' }, 'CONSENT_REFERENCE_INVALID'],
    [{ consentPolicyVersion: '' }, 'CONSENT_POLICY_INVALID'],
  ];
  for (const [input, code] of cases) {
    const f = await setup(); const result = await f.submit(input);
    assert.equal(result.code, code, JSON.stringify(input)); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
    assert.ok(!result.message.includes("operation is not available"));
  }
});

test('draft revisions, missing photo and stale versions remain blocked with no mutation', async () => {
  for (const [options, input, code] of [[{ state: 'DRAFT' }, {}, 'CONSENT_REVISION_REQUIRED'], [{ photo: false }, {}, 'CONSENT_PORTRAIT_MISSING'], [{}, { expectedVersion: '5' }, 'CONFLICT']]) {
    const f = await setup(options); assert.equal((await f.submit(input)).code, code); assert.equal(f.requests.length, 0);
  }
});


test('client recorded timestamps cannot override the trusted server clock; expiry and permissions remain intact', async () => {
  for (const forged of ['2099-01-01T00:00', '1900-01-01T00:00', 'invalid', '']) {
    const f = await setup(); const before = Date.now();
    const result = await f.submit({ consentRecordedAt: forged, consentExpiresAt: '2099-01-01T12:30', publishPhone: 'on', publishEmail: 'on' });
    assert.equal(result.status, 'success', result.message);
    const request = f.requests[0];
    assert.ok(request.consentRecordedAt.getTime() >= before && request.consentRecordedAt.getTime() <= Date.now());
    assert.equal(request.consentExpiresAt.toISOString(), '2099-01-01T12:30:00.000Z');
    assert.equal(request.publishPortrait, true); assert.equal(request.publishPhone, true); assert.equal(request.publishEmail, true);
    assert.equal(request.consentReference, 'synthetic-evidence'); assert.equal(request.consentPolicyVersion, 'v1');
  }
});

test('optional expiry still rejects impossible dates and timezone suffixes', async () => {
  for (const value of ['2099-02-30T12:00', '2099-01-01T12:00+06:00']) {
    const f = await setup(); assert.equal((await f.submit({ consentExpiresAt: value })).code, 'CONSENT_EXPIRY_INVALID');
    assert.equal(f.requests.length, 0);
  }
});


test('unauthorized submissions cannot create consent requests', async () => {
  const f = await setup({ denied: true });
  await assert.rejects(f.submit({}), error => error.code === 'FORBIDDEN');
  assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
});
