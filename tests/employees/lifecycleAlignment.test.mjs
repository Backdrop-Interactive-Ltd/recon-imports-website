import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, rejection } from './fixture.mjs';

async function published(f, withKey = false, expires) {
  const e = await f.employee(); const p = await f.submitted(e.id);
  const identity = withKey ? await f.call('issueVerificationIdentity', e.id) : null;
  const approvals = [];
  for (const scope of ['DIRECTORY', 'VERIFICATION']) {
    const a = await f.approved(e.id, p.revision, scope, expires ? { consentExpiresAt: expires } : {});
    await f.call('publishEmployeeProfile', e.id, { approvalId: a.id }); approvals.push(a);
  }
  return { e, p, identity, approvals };
}

test('resign/rejoin preserves code, URL, keys and revisions; only frozen approved information returns', async () => {
  const f = await fixture(); try {
    const urls = await f.load('lib/employees/profileUrls.ts');
    const admin = await f.load('lib/employees/adminQueries.ts');
    const { e, p, identity, approvals } = await published(f, true);
    const url = urls.getEmployeeProfileUrl(e.employeeCode);
    assert.match(url, new RegExp(`/team/${e.employeeCode}$`));
    assert.equal((await f.queries.getPublicEmployeeProfile(e.employeeCode)).state, 'ACTIVE');
    await f.call('createDraftRevision', e.id, { fields: { publicName: 'UNAPPROVED PRIVATE', designation: 'Draft title' } });
    const history = await f.prisma.employeePublicProfile.count({ where: { employeeId: e.id } });
    await f.call('resignEmployee', e.id);
    assert.deepEqual(JSON.parse(JSON.stringify(await f.queries.getPublicEmployeeProfile(e.employeeCode))), { state: 'RESIGNED' });
    assert.equal(await f.queries.getEmployeeVerification(identity.publicKey), null);
    assert.ok(!(await f.queries.getPublicTeamMembers({ pageSize: 50 })).some(row => row.employeeCode === e.employeeCode));
    const archived = await admin.listEmployeesForAdmin({ status: 'ARCHIVED', search: e.employeeCode });
    assert.equal(archived.length, 1); assert.equal(archived[0].employmentStatus, 'RESIGNED');
    assert.equal((await admin.getEmployeeByCode(e.employeeCode)).profileUrl, url);
    assert.equal(await f.prisma.employeePublicProfile.count({ where: { employeeId: e.id } }), history);
    const key = await f.prisma.employeeVerificationIdentity.findUnique({ where: { id: identity.id } });
    assert.equal(key.retiredAt, null);
    await f.call('rejoinEmployee', e.id);
    const result = await f.queries.getPublicEmployeeProfile(e.employeeCode);
    assert.equal(result.state, 'ACTIVE'); assert.equal(result.profile.publicName, p.publicName);
    assert.equal(result.profile.officialPhone, null); assert.equal(result.profile.officialEmail, null);
    assert.doesNotMatch(JSON.stringify(result), /UNAPPROVED|internalName|consentReference|actorSnapshot|publicKey/);
    assert.ok(await f.queries.getEmployeeVerification(identity.publicKey));
    assert.ok((await f.queries.getPublicTeamMembers({ search: p.publicName, pageSize: 50 })).some(row => row.employeeCode === e.employeeCode));
    assert.equal(await f.prisma.employeePublicProfile.count({ where: { employeeId: e.id } }), history);
    assert.equal(await f.prisma.employeeVerificationIdentity.count({ where: { employeeId: e.id } }), 1);
    assert.equal(urls.getEmployeeProfileUrl((await f.prisma.employee.findUnique({ where: { id: e.id } })).employeeCode), url);
    for (const a of approvals) assert.equal((await f.prisma.employeePublicationApproval.findUnique({ where: { id: a.id } })).status, 'APPROVED');
    const events = await f.prisma.employeeAuditEvent.findMany({ where: { employeeId: e.id } });
    assert.ok(events.some(x => x.summary === 'STATUS_CHANGED:RESIGNED'));
    assert.ok(events.some(x => x.summary === 'STATUS_CHANGED:REJOIN'));
    await f.call('archiveEmployee', e.id);
    assert.deepEqual(JSON.parse(JSON.stringify(await f.queries.getPublicEmployeeProfile(e.employeeCode))), { state: 'UNAVAILABLE' });
    await f.call('rejoinEmployee', e.id);
    assert.equal((await f.queries.getPublicEmployeeProfile(e.employeeCode)).state, 'ACTIVE');
  } finally { await f.close(); }
});

test('canonical profiles and rejoin need no opaque identity; inactive/unknown states expose no details', async () => {
  const f = await fixture(); try {
    const { e } = await published(f);
    assert.equal(await f.prisma.employeeVerificationIdentity.count({ where: { employeeId: e.id } }), 0);
    await f.call('changeEmployeeStatus', e.id, { status: 'INACTIVE' });
    assert.deepEqual(JSON.parse(JSON.stringify(await f.queries.getPublicEmployeeProfile(e.employeeCode))), { state: 'UNAVAILABLE' });
    await f.call('rejoinEmployee', e.id);
    assert.equal((await f.queries.getPublicEmployeeProfile(e.employeeCode)).state, 'ACTIVE');
    assert.deepEqual(JSON.parse(JSON.stringify(await f.queries.getPublicEmployeeProfile('RI-EMP-999999999999'))), { state: 'NOT_FOUND' });
    assert.deepEqual(JSON.parse(JSON.stringify(await f.queries.getPublicEmployeeProfile("' OR 1=1"))), { state: 'NOT_FOUND' });
    await rejection(f.services.createEmployee({ employeeCode: e.employeeCode }), 'VALIDATION');
  } finally { await f.close(); }
});

test('withdrawn/expired/missing consent or approval blocks rejoin with atomic rollback', async () => {
  const f = await fixture(); try {
    for (const kind of ['withdrawn', 'expired', 'missing']) {
      const { e, approvals } = await published(f, false, kind === 'expired' ? new Date(Date.now() + 2000) : undefined);
      await f.call('resignEmployee', e.id);
      if (kind === 'withdrawn') await f.call('withdrawEmployeeConsent', e.id, { consentReference: approvals[0].consentReference });
      if (kind === 'missing') await f.owner.query('UPDATE "Employee" SET "reactivationApprovalIds"=ARRAY[]::text[] WHERE id=$1', [e.id]);
      if (kind === 'expired') await new Promise(resolve => setTimeout(resolve, 2100));
      const before = await f.prisma.employee.findUnique({ where: { id: e.id } });
      const audits = await f.prisma.employeeAuditEvent.count({ where: { employeeId: e.id } });
      const count = await f.prisma.employeePublicationApproval.count({ where: { employeeId: e.id } });
      await rejection(f.call('rejoinEmployee', e.id), kind === 'withdrawn' ? 'CONSENT_WITHDRAWN' : kind === 'expired' ? 'CONSENT_EXPIRED' : 'APPROVAL_REQUIRED');
      assert.deepEqual(await f.prisma.employee.findUnique({ where: { id: e.id } }), before);
      assert.equal(await f.prisma.employeeAuditEvent.count({ where: { employeeId: e.id } }), audits);
      assert.equal(await f.prisma.employeePublicationApproval.count({ where: { employeeId: e.id } }), count);
      assert.deepEqual(JSON.parse(JSON.stringify(await f.queries.getPublicEmployeeProfile(e.employeeCode))), { state: 'RESIGNED' });
    }
    const e = await f.employee(false); const p = await f.submitted(e.id);
    const pending = await f.call('requestPublicationApproval', e.id, { revision: p.revision, scope: 'VERIFICATION', consentReference: 'unapproved', consentPolicyVersion: 'v1', consentRecordedAt: new Date(Date.now() - 1000) });
    await rejection(f.call('rejoinEmployee', e.id, { approvalIds: [pending.id] }), 'APPROVAL_REQUIRED');
  } finally { await f.close(); }
});

test('private archive queries enforce current role and disabled-account authorization', async () => {
  const f = await fixture(); try {
    const admin = await f.load('lib/employees/adminQueries.ts'); const { e } = await published(f);
    await f.call('resignEmployee', e.id);
    f.setSubject('eid_admin'); assert.equal((await admin.getEmployeeByCode(e.employeeCode)).employmentStatus, 'RESIGNED');
    for (const name of ['resignEmployee', 'rejoinEmployee']) await assert.rejects(f.call(name, e.id), error => error.code === 'FORBIDDEN');
    f.setSubject('eid_editor');
    await assert.rejects(admin.getEmployeeByCode(e.employeeCode), error => error.code === 'FORBIDDEN');
    await assert.rejects(admin.listEmployeesForAdmin({ status: 'ARCHIVED' }), error => error.code === 'FORBIDDEN');
    f.setSubject('eid_super'); await f.owner.query(`UPDATE "AdminUser" SET role='ADMIN' WHERE id='eid_super'`);
    await assert.rejects(f.call('rejoinEmployee', e.id), error => error.code === 'FORBIDDEN');
    await f.owner.query(`UPDATE "AdminUser" SET role='SUPER_ADMIN',"isActive"=false WHERE id='eid_super'`);
    await assert.rejects(admin.getEmployeeByCode(e.employeeCode), error => error.code === 'UNAUTHENTICATED');
    await assert.rejects(f.call('rejoinEmployee', e.id), error => error.code === 'UNAUTHENTICATED');
  } finally { await f.close(); }
});

test('racing rejoin/profile edit and resignation/publication serialize with one version winner', async () => {
  const f = await fixture(); try {
    const { e, approvals } = await published(f);
    await f.call('resignEmployee', e.id);
    const version = await f.version(e.id);
    const rejoin = await Promise.allSettled([
      f.services.rejoinEmployee({ employeeId: e.id, expectedVersion: version }),
      f.services.createDraftRevision({ employeeId: e.id, expectedVersion: version, fields: { publicName: 'UNAPPROVED RACING' } }),
    ]);
    assert.equal(rejoin.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(rejoin.find(x => x.status === 'rejected').reason.code, 'CONFLICT');
    if ((await f.prisma.employee.findUnique({ where: { id: e.id } })).employmentStatus !== 'ACTIVE') await f.call('rejoinEmployee', e.id);
    const current = await f.prisma.employeePublicationApproval.findFirst({ where: { employeeId: e.id, isPublished: true, scope: 'VERIFICATION' } });
    const currentVersion = await f.version(e.id);
    const race = await Promise.allSettled([
      f.services.resignEmployee({ employeeId: e.id, expectedVersion: currentVersion }),
      f.services.publishEmployeeProfile({ employeeId: e.id, expectedVersion: currentVersion, approvalId: current.id }),
    ]);
    assert.equal(race.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(race.find(x => x.status === 'rejected').reason.code, 'CONFLICT');
    const publicResult = await f.queries.getPublicEmployeeProfile(e.employeeCode);
    assert.ok(publicResult.state === 'RESIGNED' || publicResult.profile.publicName === 'Synthetic Public Name');
    assert.equal(await f.prisma.employeePublicProfile.count({ where: { employeeId: e.id, state: 'SUBMITTED' } }), 1);
    assert.ok(approvals.length);
  } finally { await f.close(); }
});

test('concurrent status changes admit one winner; audit failure rolls back the complete rejoin operation', async () => {
  const f = await fixture(); try {
    const { e } = await published(f);
    const version = await f.version(e.id);
    const race = await Promise.allSettled(['INACTIVE', 'RESIGNED'].map(status => f.services.changeEmployeeStatus({ employeeId: e.id, expectedVersion: version, status })));
    assert.equal(race.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(race.find(x => x.status === 'rejected').reason.code, 'CONFLICT');
    const before = await f.prisma.employee.findUnique({ where: { id: e.id } });
    const approvals = await f.prisma.employeePublicationApproval.count({ where: { employeeId: e.id } });
    await f.owner.query('REVOKE INSERT ON "EmployeeAuditEvent" FROM eid02b_runtime');
    await rejection(f.call('rejoinEmployee', e.id), 'UNAVAILABLE');
    assert.deepEqual(await f.prisma.employee.findUnique({ where: { id: e.id } }), before);
    assert.equal(await f.prisma.employeePublicationApproval.count({ where: { employeeId: e.id } }), approvals);
    assert.equal(await f.prisma.employeePublicationApproval.count({ where: { employeeId: e.id, isPublished: true } }), 0);
  } finally {
    await f.owner.query('GRANT INSERT ON "EmployeeAuditEvent" TO eid02b_runtime');
    await f.close();
  }
});
