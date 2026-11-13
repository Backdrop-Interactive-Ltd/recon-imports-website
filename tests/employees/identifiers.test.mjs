import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomBytes,randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const {formatEmployeeCode,generateVerificationKey}=createRequire(import.meta.url)('../../lib/employees/identifiers.ts');
import {fixture,rejection} from './fixture.mjs';

test('identifier format, entropy source, no truncation or count/max allocation',async()=>{
  assert.equal(formatEmployeeCode(BigInt(101)),'RI-EMP-101');
  assert.equal(formatEmployeeCode(BigInt(10000)),'RI-EMP-10000');
  assert.match(generateVerificationKey(),/^[0-9a-f]{32}$/);
  assert.throws(()=>formatEmployeeCode(BigInt(0)));
  const source=await readFile('lib/employees/services.ts','utf8');
  assert.match(source,/nextval\('recon_employee_official_code_seq'\)/);
  const creation=source.slice(source.indexOf('export async function createEmployee'),source.indexOf('export async function createDepartment'));
  assert.doesNotMatch(creation,/count\(|max\(|aggregate\(/i);
});
test('concurrent creation and competing identity issuance are unique in PostgreSQL',async()=>{
  const f=await fixture();try{
    const employees=await Promise.all(Array.from({length:8},()=>f.services.createEmployee({})));
    assert.equal(new Set(employees.map(e=>e.employeeCode)).size,8);
    const numbers=employees.map(e=>BigInt(e.employeeCode.slice(7))).sort((a,b)=>a<b?-1:1);
    assert.equal(numbers[7]-numbers[0],BigInt(7));
    assert.ok(employees.every(e=>e.employmentStatus==='INACTIVE'));
    const e=await f.employee();const version=await f.version(e.id);
    const results=await Promise.allSettled([1,2].map(()=>f.services.issueVerificationIdentity({employeeId:e.id,expectedVersion:version})));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(await f.prisma.employeeVerificationIdentity.count({where:{employeeId:e.id,retiredAt:null}}),1);
  }finally{await f.close();}
});
test('real unique-key collision retries whole transactions, remains bounded, and never leaves partial audits',async()=>{
  let forced=null,uses=0,always=false;
  const f=await fixture({'node:crypto':{randomUUID,randomBytes:size=>size===16&&forced&&(always||uses++===0)?Buffer.from(forced,'hex'):randomBytes(size)}});
  try{
    const first=await f.employee();const identity=await f.call('issueVerificationIdentity',first.id);
    forced=identity.publicKey;uses=0;
    const second=await f.employee();const replacement=await f.call('issueVerificationIdentity',second.id);
    assert.notEqual(replacement.publicKey,forced);
    assert.equal(await f.prisma.employeeAuditEvent.count({where:{employeeId:second.id,eventType:'IDENTITY_ISSUED'}}),1);
    always=true;const third=await f.employee();
    await rejection(f.call('issueVerificationIdentity',third.id),'CONFLICT');
    assert.equal(await f.prisma.employeeVerificationIdentity.count({where:{employeeId:third.id}}),0);
    assert.equal(await f.prisma.employeeAuditEvent.count({where:{employeeId:third.id,eventType:'IDENTITY_ISSUED'}}),0);
  }finally{await f.close();}
});
