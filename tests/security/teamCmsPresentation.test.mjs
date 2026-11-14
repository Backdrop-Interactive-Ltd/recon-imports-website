import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHarness } from './moduleHarness.mjs';

const directory = 'app/admin/(dashboard)/employees';
const draft = { id: 'profile', revision: 2, state: 'DRAFT', version: 4, publicName: 'Synthetic team member', designation: 'Sales advisor', experienceSummary: 'Synthetic experience', biography: 'Synthetic profile', departmentId: null, departmentName: null, officialPhone: null, officialEmail: 'team@example.invalid', displayOrder: 0, isFeatured: false };
const submitted = { ...draft, id: 'submitted', revision: 1, state: 'SUBMITTED' };
const employee = { id: 'employee', employeeCode: 'RI-EMP-101', internalName: 'Private working name', employmentStatus: 'ACTIVE', archivedAt: null, personalDataErasedAt: null, version: 10, profilePath: '/team/RI-EMP-101', profileUrl: 'https://www.reconimports.com/team/RI-EMP-101' };
const approval = { id: 'approval', profileRevision: 1, scope: 'DIRECTORY', status: 'PENDING', isPublished: false, employmentEpoch: 3, consentReference: 'RESTRICTED-CONSENT-REFERENCE', consentPolicyVersion: 'synthetic-v1', consentRecordedAt: new Date('2026-01-01'), consentExpiresAt: null, withdrawnAt: null, evidenceErasedAt: null, publishPhone: false, publishEmail: true, selfApproved: false };

async function rendered({ role = 'SUPER_ADMIN', period = 3, includeSnapshot = true } = {}) {
  let reviewReads = 0;
  const load = createHarness({
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) },
    'next/navigation': { notFound: () => { throw Error('Not found'); } },
    [path.resolve('lib/adminAuthorization.ts')]: { requireAdminPagePermission: async permission => { assert.equal(permission, 'employees.records.read'); if (role === 'EDITOR') throw Error('Forbidden'); return { role }; } },
    [path.resolve('lib/employees/adminQueries.ts')]: {
      getEmployeeEditorData: async () => ({ employee, profiles: includeSnapshot ? [draft, submitted] : [draft], profileCount: 2, hasDraft: true, departments: [] }),
      getEmployeeReviewData: async () => { reviewReads++; return { approvals: [{ ...approval, employmentEpoch: period }], approvalCount: 1, history: [], historyCount: 0, publicationEpoch: 3 }; },
    },
    [path.resolve(`${directory}/EmployeeForms.tsx`)]: { EmployeePhotoField: () => React.createElement("input", { type: "file", name: "employeePhoto" }), EmployeeActionForm: ({ operation, children }) => React.createElement('form', { 'data-op': operation }, children) },
    [path.resolve(`${directory}/EmployeeIdentityControls.tsx`)]: { default: () => React.createElement("div", { "data-identity-controls": true }) },
    [path.resolve(`${directory}/page.module.css`)]: { default: {} },
  });
  const page = await load(`${directory}/[employeeCode]/page.tsx`);
  const tree = await page.default({ params: Promise.resolve({ employeeCode: employee.employeeCode }), searchParams: Promise.resolve({}) });
  return { html: renderToStaticMarkup(tree), reviewReads };
}

test('Team CMS presents the requested workflow while keeping technical history collapsed and future features unavailable', async () => {
  const { html } = await rendered();
  for (const text of ['Team Members', 'Add/Edit Profile', 'Save Draft', 'Review/Publish', 'Identity/QR', 'Status', 'Synthetic team member', 'Designation', 'Experience']) assert.ok(html.includes(text), text);
  assert.match(html, /<details id="technical-history"[^>]*>/);
  assert.ok(!/<details id="technical-history"[^>]*\bopen/.test(html));
  assert.ok(html.indexOf('Record version:') > html.indexOf('id="technical-history"'));
  assert.ok(html.includes('Protected history'));
  assert.ok(html.includes("data-identity-controls"));
  assert.ok(html.includes('name="employeePhoto"'));
  assert.ok(!html.includes('href="https://www.reconimports.com/team/'));
});

test('ADMIN gets profile controls but no restricted evidence, approval decisions, lifecycle actions or technical history', async () => {
  const { html, reviewReads } = await rendered({ role: 'ADMIN' });
  assert.equal(reviewReads, 0);
  assert.ok(html.includes('data-op="saveDraft"'));
  assert.ok(html.includes('data-op="submit"'));
  assert.ok(!html.includes('RESTRICTED-CONSENT-REFERENCE'));
  for (const operation of ['approve', 'publish', 'resign', 'rejoin']) assert.ok(!html.includes(`data-op="${operation}"`));
  assert.ok(!html.includes('id="technical-history"'));
  await assert.rejects(rendered({ role: 'EDITOR' }), /Forbidden/);
});

test('review requires the exact loaded submitted profile and current period without merging save and approval', async () => {
  const normal = await rendered();
  assert.ok(normal.html.includes('data-op="approve"'));
  assert.ok(normal.html.includes('data-op="requestApproval"'));
  assert.ok(!normal.html.includes('data-op="publish"'), 'A pending request cannot be published');
  const stale = await rendered({ period: 2 });
  assert.ok(!stale.html.includes('data-op="approve"'));
  const missing = await rendered({ includeSnapshot: false });
  assert.ok(!missing.html.includes('data-op="approve"'));
  assert.ok(missing.html.includes('Load the corresponding saved profile'));
});

test('simplified forms retain concurrency fields and explicit confirmation without invoking any action', async () => {
  const neverInvoke = () => { throw Error('A presentation check must not execute a mutation'); };
  const load = createHarness({
    react: { useState: () => [null, () => {}], useEffect: () => {}, useActionState: () => [{ status: 'idle', message: '' }, neverInvoke, false] },
    'next/link': { default: ({ href, children }) => React.createElement('a', { href }, children) },
    [path.resolve(`${directory}/actions.ts`)]: { createEmployeeAction: neverInvoke, employeeAction: neverInvoke },
    [path.resolve(`${directory}/page.module.css`)]: { default: {} },
  });
  const forms = await load(`${directory}/EmployeeForms.tsx`);
  const html = renderToStaticMarkup(React.createElement(forms.EmployeeActionForm, {
    operation: 'publish', employeeId: 'synthetic-employee', expectedVersion: 9, revision: 2, expectedProfileVersion: 4,
    approvalId: 'synthetic-approval', label: 'Publish approved information', confirmation: 'Confirm approved publication',
  }));
  for (const [name, value] of Object.entries({ operation: 'publish', employeeId: 'synthetic-employee', expectedVersion: '9', revision: '2', expectedProfileVersion: '4', approvalId: 'synthetic-approval' })) {
    assert.ok(html.includes(`name="${name}" value="${value}"`), name);
  }
  const confirmationInput = html.match(/<input[^>]*name="confirmed"[^>]*>/)?.[0];
  assert.ok(confirmationInput);
  assert.ok(confirmationInput.includes('type="checkbox"'));
  assert.ok(confirmationInput.includes('required=""'));
});


test('consent UI records time automatically and retains optional expiry, evidence and field permissions', async () => {
  const { html } = await rendered();
  assert.ok(!html.includes('name="consentRecordedAt"'));
  assert.match(html, /current server UTC time/);
  for (const name of ['consentReference', 'consentPolicyVersion', 'consentExpiresAt', 'publishPortrait', 'publishPhone', 'publishEmail']) assert.ok(html.includes('name="' + name + '"'), name);
  const expiry = html.match(/<input[^>]*name="consentExpiresAt"[^>]*>/)?.[0];
  assert.ok(expiry); assert.ok(!expiry.includes('required'));
});
