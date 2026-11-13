import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import pg from 'pg';
import {fixture} from './fixture.mjs';

const sqlReject=(operation,codes=['23505','23503','23514','P0001'])=>assert.rejects(operation,error=>codes.includes(error.code));

test('real schema retains baseline tables/columns and installs six additive tables, indexes and triggers',async()=>{
 const f=await fixture();try{
  const names=(await f.owner.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(r=>r.tablename);
  for(const name of ['AdminUser','User','Account','Session','VerificationToken','Media','Brand','Car','SiteSetting','Employee','Department','EmployeePublicProfile','EmployeeVerificationIdentity','EmployeePublicationApproval','EmployeeAuditEvent']) assert.ok(names.includes(name),name);
  const columns=await f.owner.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='AdminUser' ORDER BY ordinal_position");
  assert.deepEqual(columns.rows.map(r=>r.column_name),['id','name','email','passwordHash','role','isActive','createdAt','updatedAt']);
  const migration=await f.owner.query('SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL');assert.equal(migration.rows[0].count,12);
  const indexes=await f.owner.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
  for(const name of ['department_name_ci','employee_one_draft','employee_one_live_identity','employee_one_published_scope']) assert.ok(indexes.rows.some(r=>r.indexname===name));
  const triggers=await f.owner.query("SELECT tgname FROM pg_trigger WHERE NOT tgisinternal");
  for(const name of ['employee_guard','employee_profile_guard','employee_identity_guard','employee_approval_guard','employee_audit_guard']) assert.ok(triggers.rows.some(r=>r.tgname===name));
  const sequence=await f.owner.query("SELECT start_value,increment_by,cycle FROM pg_sequences WHERE sequencename='recon_employee_code_seq'");
  assert.equal(String(sequence.rows[0].start_value),'1');assert.equal(String(sequence.rows[0].increment_by),'1');assert.equal(sequence.rows[0].cycle,false);
 }finally{await f.close();}
});
test('real unique constraints, partial indexes, positive versions and restrictive deletion',async()=>{
 const f=await fixture();try{
  const suffix=randomUUID();const d=await f.services.createDepartment({name:`Synthetic ${suffix}`,slug:`synthetic-${suffix}`});
  await sqlReject(f.owner.query('INSERT INTO "Department" (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())',[randomUUID(),d.name.toUpperCase(),`other-${suffix}`]),['23505']);
  await sqlReject(f.owner.query('UPDATE "Department" SET version=0 WHERE id=$1',[d.id]),['23514']);
  const e=await f.services.createEmployee({departmentId:d.id});
  await sqlReject(f.owner.query('INSERT INTO "Employee" (id,"employeeCode","updatedAt") VALUES ($1,$2,now())',[randomUUID(),e.employeeCode]),['23505']);
  await sqlReject(f.owner.query('INSERT INTO "EmployeePublicProfile" (id,"employeeId",revision,"updatedAt") VALUES ($1,$2,2,now())',[randomUUID(),e.id]),['23505']);
  await sqlReject(f.owner.query('DELETE FROM "Department" WHERE id=$1',[d.id]),['23503','23001']);
  await sqlReject(f.owner.query('DELETE FROM "Employee" WHERE id=$1',[e.id]),['P0001']);
  await sqlReject(f.owner.query('UPDATE "Employee" SET "employeeCode"=$2 WHERE id=$1',[e.id,'RCI-999999999']),['P0001']);
  await f.call('changeEmployeeStatus',e.id,{status:'ACTIVE'});
  const identity=await f.call('issueVerificationIdentity',e.id);
  await sqlReject(f.owner.query('INSERT INTO "EmployeeVerificationIdentity" (id,"employeeId","publicKey") VALUES ($1,$2,$3)',[randomUUID(),e.id,randomBytes(16).toString('hex')]),['23505']);
  await sqlReject(f.owner.query('UPDATE "EmployeeVerificationIdentity" SET "publicKey"=$2 WHERE id=$1',[identity.id,randomBytes(16).toString('hex')]),['P0001']);
  await f.call('retireVerificationIdentity',e.id,{identityId:identity.id});
  await sqlReject(f.owner.query('UPDATE "EmployeeVerificationIdentity" SET "retiredAt"=NULL WHERE id=$1',[identity.id]),['P0001']);
  const other=await f.employee();
  await sqlReject(f.owner.query('INSERT INTO "EmployeeVerificationIdentity" (id,"employeeId","publicKey") VALUES ($1,$2,$3)',[randomUUID(),other.id,identity.publicKey]),['23505']);
  await sqlReject(f.owner.query('DELETE FROM "EmployeeVerificationIdentity" WHERE id=$1',[identity.id]),['P0001']);
 }finally{await f.close();}
});
test('submitted content, approval ownership/state, one published scope and terminal withdrawal are enforced in SQL',async()=>{
 const f=await fixture();try{
  const e=await f.employee();const p=await f.submitted(e.id);
  await sqlReject(f.owner.query('UPDATE "EmployeePublicProfile" SET biography=$2 WHERE id=$1',[p.id,'Tampered synthetic content']),['P0001']);
  await sqlReject(f.owner.query('UPDATE "EmployeePublicProfile" SET state=\'DRAFT\' WHERE id=$1',[p.id]),['P0001']);
  await sqlReject(f.owner.query(`INSERT INTO "EmployeePublicationApproval" (id,"employeeId","profileRevision","employmentEpoch",scope,"consentReference","consentPolicyVersion","consentRecordedAt","updatedAt") VALUES ($1,$2,99999,2,'DIRECTORY','synthetic','v1',now(),now())`,[randomUUID(),e.id]),['23503']);
  const a=await f.approved(e.id,p.revision);const b=await f.approved(e.id,p.revision);
  await f.call('publishEmployeeProfile',e.id,{approvalId:a.id});
  await sqlReject(f.owner.query('UPDATE "EmployeePublicationApproval" SET "isPublished"=true,"publishedAt"=now() WHERE id=$1',[b.id]),['23505']);
  await sqlReject(f.owner.query('UPDATE "EmployeePublicationApproval" SET "publishPhone"=true WHERE id=$1',[a.id]),['P0001']);
  await f.call('withdrawPublicationApproval',e.id,{approvalId:a.id});
  await sqlReject(f.owner.query('UPDATE "EmployeePublicationApproval" SET status=\'APPROVED\',"withdrawnAt"=NULL WHERE id=$1',[a.id]),['P0001']);
  await sqlReject(f.owner.query('DELETE FROM "EmployeePublicationApproval" WHERE id=$1',[a.id]),['P0001']);
 }finally{await f.close();}
});
test('audit is append-only but admin deletion permits only narrowly scoped FK cleanup',async()=>{
 const f=await fixture();try{
  const actor=`eid_temporary_${randomUUID()}`;
  await f.owner.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,'Synthetic Actor',$2,'unused','SUPER_ADMIN',now())`,[actor,`${actor}@example.invalid`]);
  f.setSubject(actor);const e=await f.employee();const p=await f.submitted(e.id);const a=await f.approved(e.id,p.revision);
  const event=await f.prisma.employeeAuditEvent.findFirstOrThrow({where:{employeeId:e.id}});
  await sqlReject(f.owner.query('UPDATE "EmployeeAuditEvent" SET summary=$2 WHERE id=$1',[event.id,'Tampered']),['P0001']);
  await sqlReject(f.owner.query('UPDATE "EmployeeAuditEvent" SET "actorAdminId"=NULL WHERE id=$1',[event.id]),['P0001']);
  await sqlReject(f.owner.query('DELETE FROM "EmployeeAuditEvent" WHERE id=$1',[event.id]),['P0001']);
  await f.owner.query('DELETE FROM "AdminUser" WHERE id=$1',[actor]);
  const retained=await f.prisma.employeeAuditEvent.findUniqueOrThrow({where:{id:event.id}});
  assert.equal(retained.actorAdminId,null);assert.equal(retained.actorSnapshot,actor);
  const approved=await f.prisma.employeePublicationApproval.findUniqueOrThrow({where:{id:a.id}});
  assert.equal(approved.decidedById,null);assert.equal(approved.decidedBySnapshot,actor);
 }finally{await f.close();}
});
test('disposable roles cannot connect elsewhere or reset sequence; runtime cannot mutate audit history',async()=>{
 const f=await fixture();try{
  const roles=await f.owner.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname IN ('eid02b_test','eid02b_runtime')");
  assert.ok(roles.rows.every(r=>!r.rolsuper&&!r.rolcreatedb&&!r.rolcreaterole));
  const elsewhere=new URL(process.env.EID02B_RUNTIME_URL);elsewhere.pathname='/postgres';
  const connection=new pg.Client({connectionString:elsewhere.toString()});
  await assert.rejects(connection.connect());await connection.end();
  await assert.rejects(f.prisma.$executeRawUnsafe('UPDATE "EmployeeAuditEvent" SET summary=\'tamper\''));
  await assert.rejects(f.prisma.$queryRawUnsafe("SELECT setval('recon_employee_code_seq',1)"));
  await assert.rejects(f.prisma.$queryRawUnsafe("SELECT setval('recon_employee_official_code_seq',101)"));
 }finally{await f.close();}
});
