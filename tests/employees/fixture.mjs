import assert from 'node:assert/strict';
import path from 'node:path';
import pg from 'pg';
import { createRequire } from 'node:module';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHarness } from '../security/moduleHarness.mjs';
const require=createRequire(import.meta.url);
const { PrismaClient, Prisma }=require('../../lib/generated/prisma/client.ts');

export async function fixture(overrides = {}, globals = {}) {
  const url = new URL(process.env.DATABASE_URL);
  const runtimeRole=new URL(process.env.EID02B_RUNTIME_URL).username;
  assert.ok(['eid02b_runtime','recon_runtime'].includes(runtimeRole));
  assert.equal(url.hostname,'127.0.0.1');
  assert.match(process.env.EID02B_DATABASE ?? '',/^eid(?:02b|03|04)_[a-f0-9]{12}$/);
  assert.equal(url.pathname,`/${process.env.EID02B_DATABASE}`);
  assert.ok(/^EID-(02B|03|04) isolated disposable /.test(process.env.EID02B_MARKER ?? ''));
  const owner = new pg.Client({connectionString:url.toString()}); await owner.connect();
  const marker=await owner.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  assert.equal(marker.rows[0].marker,process.env.EID02B_MARKER);
  if(process.env.RECON_TEST_PREPROVISIONED_GRANTS==='LAUNCH-05D') {
    assert.equal(url.username,'recon_migrator');
    assert.equal(new URL(process.env.EID02B_RUNTIME_URL).username,'recon_runtime');
  } else {
  await owner.query('GRANT USAGE ON SCHEMA public TO eid02b_runtime');
  await owner.query('GRANT SELECT (id,name,email,role,"isActive"), UPDATE ("updatedAt") ON "AdminUser" TO eid02b_runtime');
  await owner.query('GRANT SELECT,INSERT,UPDATE ON "Department","Employee","EmployeePublicProfile","EmployeeVerificationIdentity","EmployeePublicationApproval" TO eid02b_runtime');
  await owner.query('GRANT SELECT,INSERT ON "EmployeeAuditEvent" TO eid02b_runtime');
  await owner.query('GRANT USAGE,SELECT ON SEQUENCE recon_employee_code_seq, recon_employee_official_code_seq TO eid02b_runtime');
  }
  for (const [id,role] of [['eid_super','SUPER_ADMIN'],['eid_admin','ADMIN'],['eid_editor','EDITOR']]) {
    await owner.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"isActive","updatedAt") VALUES ($1,$1,$2,'synthetic-unused-hash',$3,true,CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,"isActive"=true`,[id,`${id}@example.invalid`,role]);
  }
  const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.EID02B_RUNTIME_URL})});
  const transactionErrors=[];
  const transaction=prisma.$transaction.bind(prisma);
  prisma.$transaction=async (...args)=>{try{return await transaction(...args);}catch(error){transactionErrors.push(error);throw error;}};
  let subject='eid_super';
  const auth={auth:async()=>subject ? {user:{id:subject,role:'SUPER_ADMIN'}} : null};
  const load=createHarness({
    [path.resolve('lib/auth.ts')]:auth,
    [path.resolve('lib/prisma.ts')]:{prisma},
    [path.resolve('lib/generated/prisma/client.ts')]:{Prisma},
    'next/navigation':{redirect:()=>{throw Error('Unexpected redirect');}},
    ...overrides,
  }, globals);
  const services=await load('lib/employees/services.ts');
  const queries=await load('lib/employees/publicQueries.ts');
  const version=async employeeId=>(await prisma.employee.findUniqueOrThrow({where:{id:employeeId}})).version;
  async function call(name,employeeId,extra={}) { return services[name]({employeeId,expectedVersion:await version(employeeId),...extra}); }
  async function employee(active=true) {
    const created=await services.createEmployee({internalName:'Synthetic Private Name'});
    if(active) await call('changeEmployeeStatus',created.id,{status:'ACTIVE'});
    return prisma.employee.findUniqueOrThrow({where:{id:created.id}});
  }
  async function submitted(employeeId,fields={}) {
    let draft=await prisma.employeePublicProfile.findFirst({where:{employeeId,state:'DRAFT'}});
    if(!draft) draft=await call('createDraftRevision',employeeId,{fields:{}});
    await call('saveEmployeeDraft',employeeId,{revision:draft.revision,expectedProfileVersion:draft.version,fields:{publicName:'Synthetic Public Name',designation:'Synthetic Designation',officialPhone:'+8801000000000',officialEmail:'synthetic@example.invalid',...fields}});
    return call('submitEmployeeRevision',employeeId,{revision:draft.revision});
  }
  async function approved(employeeId,revision,scope='DIRECTORY',extra={}) {
    const requested=await call('requestPublicationApproval',employeeId,{revision,scope,consentReference:`synthetic-consent-${employeeId}`,consentPolicyVersion:'synthetic-v1',consentRecordedAt:new Date(Date.now()-10000),...extra});
    return call('decidePublicationApproval',employeeId,{approvalId:requested.id,decision:'APPROVED'});
  }
  return {prisma,owner,load,services,queries,version,call,employee,submitted,approved,transactionErrors,runtimeRole,
    setSubject:id=>{subject=id;},
    async close(){await prisma.$disconnect();await owner.end();},
  };
}

export async function rejection(promise, code) {
  await assert.rejects(promise,error=>error.code===code);
}
