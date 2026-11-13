import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fixture,rejection} from './fixture.mjs';

const mutationNames=['createEmployee','createDepartment','updateDepartment','createDraftRevision','saveEmployeeDraft','submitEmployeeRevision','requestPublicationApproval','decidePublicationApproval','publishEmployeeProfile','unpublishEmployeeProfile','withdrawPublicationApproval','withdrawEmployeeConsent','changeEmployeeStatus','resignEmployee','rejoinEmployee','issueVerificationIdentity','retireVerificationIdentity','archiveEmployee','restoreEmployee','eraseEmployeePersonalData'];
test('every exported mutation denies anonymous, deleted, disabled and EDITOR actors before input processing',async()=>{
 const f=await fixture();try{
  assert.deepEqual(Object.keys(f.services).filter(k=>k!=='EmployeeDomainError').sort(),mutationNames.slice().sort());
  for(const subject of [null,'eid_missing','eid_editor']) {
    f.setSubject(subject);
    for(const name of mutationNames) await assert.rejects(f.services[name]({role:'SUPER_ADMIN',actorId:'eid_super'}),e=>['UNAUTHENTICATED','FORBIDDEN'].includes(e.code),name);
  }
  await f.owner.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=\'eid_admin\'');f.setSubject('eid_admin');
  for(const name of mutationNames) await assert.rejects(f.services[name]({}),e=>e.code==='UNAUTHENTICATED',name);
  await f.owner.query('UPDATE "AdminUser" SET "isActive"=true WHERE id=\'eid_admin\'');
 }finally{await f.close();}
});
test('ADMIN can create/edit/submit only; stale SUPER_ADMIN claims and mass-assignment cannot publish',async()=>{
 const f=await fixture();try{
  f.setSubject('eid_admin');const e=await f.employee(false);const p=await f.submitted(e.id);
  assert.equal(p.state,'SUBMITTED');
  await rejection(f.services.createEmployee({employmentStatus:'ACTIVE',role:'SUPER_ADMIN'}),'VALIDATION');
  for(const name of ['createDepartment','updateDepartment','decidePublicationApproval','publishEmployeeProfile','unpublishEmployeeProfile','withdrawPublicationApproval','withdrawEmployeeConsent','changeEmployeeStatus','issueVerificationIdentity','retireVerificationIdentity','archiveEmployee','restoreEmployee','eraseEmployeePersonalData']) {
    await assert.rejects(f.services[name]({}),e=>e.code==='FORBIDDEN',name);
  }
  f.setSubject('eid_super');
  await f.owner.query('UPDATE "AdminUser" SET role=\'ADMIN\' WHERE id=\'eid_super\'');
  await assert.rejects(f.services.changeEmployeeStatus({}),e=>e.code==='FORBIDDEN');
  await f.owner.query('UPDATE "AdminUser" SET role=\'SUPER_ADMIN\' WHERE id=\'eid_super\'');
 }finally{await f.close();}
});
test('status transitions, rehire, archival and restore never resurrect old publication approvals or change codes',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const p=await f.submitted(e.id);const i=await f.call('issueVerificationIdentity',e.id);
  const a=await f.approved(e.id,p.revision,'VERIFICATION');await f.call('publishEmployeeProfile',e.id,{approvalId:a.id});
  assert.ok(await f.queries.getEmployeeVerification(i.publicKey));
  for(const status of ['INACTIVE','ACTIVE','FORMER','ACTIVE']) {
    await f.call('changeEmployeeStatus',e.id,{status});
    assert.equal(await f.queries.getEmployeeVerification(i.publicKey),null);
    await rejection(f.call('publishEmployeeProfile',e.id,{approvalId:a.id}),'INELIGIBLE');
  }
  const fresh=await f.approved(e.id,p.revision,'VERIFICATION');await f.call('publishEmployeeProfile',e.id,{approvalId:fresh.id});
  assert.ok(await f.queries.getEmployeeVerification(i.publicKey));
  await f.call('archiveEmployee',e.id);assert.equal(await f.queries.getEmployeeVerification(i.publicKey),null);
  await f.call('restoreEmployee',e.id);const restored=await f.prisma.employee.findUniqueOrThrow({where:{id:e.id}});
  assert.equal(restored.employmentStatus,'INACTIVE');assert.equal(restored.employeeCode,e.employeeCode);
  assert.equal(await f.prisma.employeeVerificationIdentity.count({where:{employeeId:e.id,publicKey:i.publicKey}}),1);
 }finally{await f.close();}
});
test('department changes preserve frozen snapshots; draft, submit and rejection transitions are guarded',async()=>{
 const f=await fixture();try{
  const tag=randomUUID();const department=await f.services.createDepartment({name:`Synthetic Original ${tag}`,slug:`synthetic-${tag}`});
  const e=await f.employee();const p=await f.submitted(e.id,{departmentId:department.id});
  await f.services.updateDepartment({id:department.id,expectedVersion:department.version,name:`Synthetic Renamed ${tag}`,slug:department.slug,isActive:false});
  assert.equal((await f.prisma.employeePublicProfile.findUniqueOrThrow({where:{id:p.id}})).departmentName,department.name);
  const requested=await f.call('requestPublicationApproval',e.id,{revision:p.revision,scope:'DIRECTORY',consentReference:'synthetic-reject',consentPolicyVersion:'v1',consentRecordedAt:new Date(Date.now()-1000)});
  await f.call('decidePublicationApproval',e.id,{approvalId:requested.id,decision:'REJECTED'});
  await rejection(f.call('decidePublicationApproval',e.id,{approvalId:requested.id,decision:'APPROVED'}),'INELIGIBLE');
  const draft=await f.call('createDraftRevision',e.id,{fields:{}});
  await rejection(f.call('submitEmployeeRevision',e.id,{revision:draft.revision}),'INELIGIBLE');
  await rejection(f.call('requestPublicationApproval',e.id,{revision:draft.revision,scope:'DIRECTORY',consentReference:'synthetic',consentPolicyVersion:'v1',consentRecordedAt:new Date()}),'INELIGIBLE');
 }finally{await f.close();}
});
test('controlled erasure redacts personal data and evidence while retaining immutable codes, keys and safe audit events',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const p=await f.submitted(e.id);const i=await f.call('issueVerificationIdentity',e.id);
  const a=await f.approved(e.id,p.revision,'VERIFICATION');await f.call('publishEmployeeProfile',e.id,{approvalId:a.id});
  await f.call('createDraftRevision',e.id,{fields:{publicName:'Synthetic Unsubmitted Name',biography:'Synthetic private draft'}});
  const result=await f.call('eraseEmployeePersonalData',e.id);
  assert.equal(result.employeeCode,e.employeeCode);assert.equal(result.mediaErasure,'NO_REFERENCED_ASSETS');
  const ledger=await f.prisma.employee.findUniqueOrThrow({where:{id:e.id}});
  assert.equal(ledger.internalName,null);assert.ok(ledger.personalDataErasedAt);assert.ok(ledger.archivedAt);
  const redacted=await f.prisma.employeePublicProfile.findUniqueOrThrow({where:{id:p.id}});
  for(const key of ['publicName','designation','biography','experienceSummary','officialPhone','officialEmail','portraitStorageKey','departmentName']) assert.equal(redacted[key],null);
  assert.equal(redacted.state,'ERASED');
  const withdrawn=await f.prisma.employeePublicationApproval.findUniqueOrThrow({where:{id:a.id}});
  assert.equal(withdrawn.consentReference,null);assert.equal(withdrawn.status,'WITHDRAWN');assert.ok(withdrawn.evidenceErasedAt);
  const identity=await f.prisma.employeeVerificationIdentity.findUniqueOrThrow({where:{id:i.id}});
  assert.equal(identity.publicKey,i.publicKey);assert.ok(identity.retiredAt);
  assert.equal(await f.queries.getEmployeeVerification(i.publicKey),null);
  await rejection(f.call('restoreEmployee',e.id),'INELIGIBLE');
  const audit=await f.prisma.employeeAuditEvent.findMany({where:{employeeId:e.id}});
  assert.ok(audit.some(event=>event.eventType==='PERSONAL_DATA_ERASED'));
  assert.equal(await f.prisma.employeePublicProfile.count({where:{employeeId:e.id,state:{not:'ERASED'}}}),0);
  assert.equal(Math.max(...audit.map(event=>event.recordVersion)),ledger.version);
  for(const event of audit){assert.ok(!event.summary.includes('Synthetic'));assert.ok(!event.summary.includes('consent-'));assert.ok(!event.summary.includes('@'));}
 }finally{await f.close();}
});

test('audit failure rolls back employee creation; actor deletion invalidates the same session hint',async()=>{
 const f=await fixture();try{
  const before=await f.prisma.employee.count();
  await f.owner.query('REVOKE INSERT ON "EmployeeAuditEvent" FROM eid02b_runtime');
  await assert.rejects(f.services.createEmployee({internalName:'Synthetic Rollback Only'}));
  assert.equal(await f.prisma.employee.count(),before);
  await f.owner.query('GRANT INSERT ON "EmployeeAuditEvent" TO eid02b_runtime');
  const actor=`eid_removed_${randomUUID()}`;
  await f.owner.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,'Synthetic Removed Actor',$2,'unused','ADMIN',now())`,[actor,`${actor}@example.invalid`]);
  f.setSubject(actor);await f.services.createEmployee({});
  await f.owner.query('DELETE FROM "AdminUser" WHERE id=$1',[actor]);
  for(const name of mutationNames) await assert.rejects(f.services[name]({}),error=>error.code==='UNAUTHENTICATED');
 }finally{await f.owner.query('GRANT INSERT ON "EmployeeAuditEvent" TO eid02b_runtime');await f.close();}
});
test('referenced portrait erasure is explicitly blocked; unavailable database never gives a public-positive fallback',async()=>{
 const f=await fixture();try{
  const e=await f.employee();
  await f.owner.query('UPDATE "EmployeePublicProfile" SET "portraitStorageKey"=\'synthetic-private-key\',"portraitStorageVersion"=\'v1\' WHERE "employeeId"=$1',[e.id]);
  await rejection(f.call('eraseEmployeePersonalData',e.id),'PORTRAIT_STORAGE_PENDING');
  assert.equal((await f.prisma.employee.findUniqueOrThrow({where:{id:e.id}})).personalDataErasedAt,null);
  // Only the unavailable boundary is mocked; eligibility/projection tests above use real SQL.
  const {createHarness}=await import('../security/moduleHarness.mjs');
  const {createRequire}=await import('node:module');
  const {Prisma}=createRequire(import.meta.url)('../../lib/generated/prisma/client.ts');
  const isolated=createHarness({[path.resolve('lib/prisma.ts')]:{prisma:{$transaction:async()=>{throw Error('private database details');}}},[path.resolve('lib/generated/prisma/client.ts')]:{Prisma}});
  const queries=await isolated('lib/employees/publicQueries.ts');
  await assert.rejects(queries.getEmployeeVerification('a'.repeat(32)),error=>error.name==='EmployeePublicQueryError'&&!error.message.includes('private database'));
  await assert.rejects(queries.getPublicEmployeeDirectory(),error=>error.name==='EmployeePublicQueryError');
 }finally{await f.close();}
});
test('competing draft saves and publication replacement use versions and atomic employee locks',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const v=await f.version(e.id);
  const outcomes=await Promise.allSettled(['First','Second'].map(publicName=>f.services.saveEmployeeDraft({employeeId:e.id,expectedVersion:v,revision:1,expectedProfileVersion:1,fields:{publicName}})));
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.find(r=>r.status==='rejected').reason.code,'CONFLICT');
  const p=await f.submitted(e.id);const a=await f.approved(e.id,p.revision);const b=await f.approved(e.id,p.revision);
  const version=await f.version(e.id);
  const publishing=await Promise.allSettled([a,b].map(approval=>f.services.publishEmployeeProfile({employeeId:e.id,expectedVersion:version,approvalId:approval.id})));
  assert.equal(publishing.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(await f.prisma.employeePublicationApproval.count({where:{employeeId:e.id,isPublished:true,scope:'DIRECTORY'}}),1);
  const other=publishing[0].status==='fulfilled'?b:a;
  const prior=await f.prisma.employeePublicationApproval.findFirstOrThrow({where:{employeeId:e.id,isPublished:true}});
  await f.owner.query('REVOKE INSERT ON "EmployeeAuditEvent" FROM eid02b_runtime');
  try {
    await assert.rejects(f.call('publishEmployeeProfile',e.id,{approvalId:other.id}));
    assert.equal((await f.prisma.employeePublicationApproval.findFirstOrThrow({where:{employeeId:e.id,isPublished:true}})).id,prior.id);
  } finally { await f.owner.query('GRANT INSERT ON "EmployeeAuditEvent" TO eid02b_runtime'); }
  await f.call('publishEmployeeProfile',e.id,{approvalId:other.id});
  assert.equal((await f.prisma.employeePublicationApproval.findFirstOrThrow({where:{employeeId:e.id,isPublished:true}})).id,other.id);
 }finally{await f.close();}
});
test('status/consent races cannot leave a published positive after the revocation commits',async()=>{
 const f=await fixture();try{
  for(const operation of ['changeEmployeeStatus','withdrawEmployeeConsent']) {
    const e=await f.employee();const p=await f.submitted(e.id);const i=await f.call('issueVerificationIdentity',e.id);const a=await f.approved(e.id,p.revision,'VERIFICATION');
    const expectedVersion=await f.version(e.id);const extra=operation==='changeEmployeeStatus'?{status:'INACTIVE'}:{consentReference:`synthetic-consent-${e.id}`};
    const outcomes=await Promise.allSettled([
      f.services.publishEmployeeProfile({employeeId:e.id,expectedVersion,approvalId:a.id}),
      f.services[operation]({employeeId:e.id,expectedVersion,...extra}),
    ]);
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
    if(outcomes[1].status==='rejected') await f.call(operation,e.id,extra);
    assert.equal(await f.queries.getEmployeeVerification(i.publicKey),null);
    assert.equal(await f.prisma.employeePublicationApproval.count({where:{employeeId:e.id,isPublished:true}}),0);
  }
 }finally{await f.close();}
});
