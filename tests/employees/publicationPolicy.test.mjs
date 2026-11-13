import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rejection} from './fixture.mjs';

test('exact frozen revisions, independent scopes, contact minimization and consent withdrawal',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const p=await f.submitted(e.id);
  const identity=await f.call('issueVerificationIdentity',e.id);
  const directory=await f.approved(e.id,p.revision);
  await f.call('publishEmployeeProfile',e.id,{approvalId:directory.id});
  assert.equal(await f.queries.getEmployeeVerification(identity.publicKey),null);
  const verification=await f.approved(e.id,p.revision,'VERIFICATION',{publishPhone:true});
  await f.call('publishEmployeeProfile',e.id,{approvalId:verification.id});
  let publicProfile=await f.queries.getEmployeeVerification(identity.publicKey);
  assert.equal(publicProfile.active,true);assert.equal(publicProfile.officialPhone,'+8801000000000');assert.equal(publicProfile.officialEmail,null);
  await f.call('unpublishEmployeeProfile',e.id,{approvalId:directory.id});
  assert.ok(await f.queries.getEmployeeVerification(identity.publicKey));
  assert.ok(!(await f.queries.getPublicEmployeeDirectory({pageSize:50})).some(row=>row.employeeCode===e.employeeCode));
  await f.call('publishEmployeeProfile',e.id,{approvalId:directory.id});
  const expected=['active','biography','checkedAt','departmentName','designation','employeeCode','experienceSummary','isFeatured','officialEmail','officialPhone','portrait','publicName'];
  assert.deepEqual(Object.keys(publicProfile).sort(),expected.sort());
  const list=await f.queries.getPublicEmployeeDirectory({search:'Synthetic'});const row=list.find(r=>r.employeeCode===e.employeeCode);
  assert.equal(row.officialPhone,null);assert.equal(row.officialEmail,null);
  assert.ok(!JSON.stringify(row).includes('synthetic-consent'));assert.ok(!('publicKey' in row));
  const draft=await f.call('createDraftRevision',e.id,{fields:{publicName:'Unapproved Changed Name'}});
  assert.equal((await f.queries.getEmployeeVerification(identity.publicKey)).publicName,'Synthetic Public Name');
  await rejection(f.call('saveEmployeeDraft',e.id,{revision:p.revision,expectedProfileVersion:p.version,fields:{publicName:'Forbidden'}}),'INELIGIBLE');
  await f.call('withdrawEmployeeConsent',e.id,{consentReference:`synthetic-consent-${e.id}`});
  assert.equal(await f.queries.getEmployeeVerification(identity.publicKey),null);
  assert.ok(!(await f.queries.getPublicEmployeeDirectory({pageSize:50})).some(r=>r.employeeCode===e.employeeCode));
  assert.equal(await f.prisma.employeePublicationApproval.count({where:{employeeId:e.id,isPublished:true}}),0);
  await rejection(f.call('publishEmployeeProfile',e.id,{approvalId:directory.id}),'INELIGIBLE');
  assert.equal(draft.state,'DRAFT');
 }finally{await f.close();}
});
test('expiry fails closed without cleanup; unknown/hidden/retired identities disclose nothing',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const p=await f.submitted(e.id);const i=await f.call('issueVerificationIdentity',e.id);
  const a=await f.approved(e.id,p.revision,'VERIFICATION',{consentExpiresAt:new Date(Date.now()+1500)});
  await f.call('publishEmployeeProfile',e.id,{approvalId:a.id});
  assert.ok(await f.queries.getEmployeeVerification(i.publicKey));
  await new Promise(r=>setTimeout(r,1600));
  assert.equal(await f.queries.getEmployeeVerification(i.publicKey),null);
  assert.equal(await f.queries.getEmployeeVerification('f'.repeat(32)),null);
  assert.equal(await f.queries.getEmployeeVerification('invalid'),null);
  await f.call('retireVerificationIdentity',e.id,{identityId:i.id});
  assert.equal(await f.queries.getEmployeeVerification(i.publicKey),null);
 }finally{await f.close();}
});
test('self approval is explicit, invalid transitions and unverified portraits are blocked',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const p=await f.submitted(e.id);const a=await f.approved(e.id,p.revision);
  assert.equal(a.selfApproved,true);
  assert.equal(await f.prisma.employeeAuditEvent.count({where:{employeeId:e.id,eventType:'REVISION_APPROVED',isSelfApproval:true}}),1);
  await rejection(f.call('decidePublicationApproval',e.id,{approvalId:a.id,decision:'REJECTED'}),'INELIGIBLE');
  await rejection(f.call('requestPublicationApproval',e.id,{revision:p.revision,scope:'DIRECTORY',consentReference:'synthetic',consentPolicyVersion:'v1',consentRecordedAt:new Date(),publishPortrait:true}),'PORTRAIT_STORAGE_PENDING');
 }finally{await f.close();}
});
