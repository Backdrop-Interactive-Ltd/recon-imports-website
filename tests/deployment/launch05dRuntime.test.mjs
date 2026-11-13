import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {connection,runtimePrisma,Prisma} from './launch05dContext.mjs';
import {createHarness} from '../security/moduleHarness.mjs';

const denied=promise=>assert.rejects(promise,error=>error.code==='42501');

test('runtime has no ownership, role elevation, permanent DDL, ledger deletion, reset or migration-history access',async()=>{
  const db=await connection('EID02B_RUNTIME_URL');try {
    const role=(await db.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=current_user")).rows[0];
    assert.ok(Object.values(role).every(value=>value===false));
    assert.equal((await db.query("SELECT count(*)::int AS count FROM pg_class WHERE relnamespace='public'::regnamespace AND relowner=current_user::regrole")).rows[0].count,0);
    assert.equal((await db.query("SELECT pg_has_role(current_user,'recon_migrator','SET') AS allowed")).rows[0].allowed,false);
    for(const sql of ['CREATE TABLE public.launch05d_forbidden(id int)','CREATE ROLE launch05d_forbidden','CREATE DATABASE launch05d_forbidden','SET ROLE recon_migrator',
      'ALTER TABLE "Employee" DISABLE TRIGGER employee_guard','TRUNCATE "AdminUser"','DROP TABLE "Media"','DELETE FROM "Employee"','UPDATE "EmployeeAuditEvent" SET summary=\'tampered\'',
      'DELETE FROM "EmployeeAuditEvent"','SELECT * FROM "_prisma_migrations"',"SELECT nextval('recon_employee_code_seq')","SELECT setval('recon_employee_official_code_seq',101)"]) await denied(db.query(sql));
  }finally{await db.end();}
});

test('creator defaults protect future tables/sequences/functions and preserve provider grants for every API role',async()=>{
  const owner=await connection(),api=await connection('LAUNCH05D_API_URL'),runtime=await connection('EID02B_RUNTIME_URL');
  try {
    await owner.query('CREATE TABLE public.launch05d_future_table(id int); CREATE SEQUENCE public.launch05d_future_seq; CREATE FUNCTION public.launch05d_future_function() RETURNS integer LANGUAGE sql AS $$SELECT 1$$');
    for(const role of ['anon','authenticated','service_role']) {
      await api.query(`SET ROLE ${role}`);
      for(const sql of ['SELECT id FROM "AdminUser"','SELECT value FROM "SiteSetting"','SELECT * FROM "EmployeeAuditEvent"','INSERT INTO public.launch05d_future_table VALUES(1)',
        'SELECT * FROM public.launch05d_future_table',"SELECT nextval('recon_employee_official_code_seq')","SELECT nextval('launch05d_future_seq')",'SELECT public.launch05d_future_function()']) await denied(api.query(sql));
      assert.equal((await api.query('SELECT id FROM auth.platform_sentinel')).rows[0].id,17);
      assert.equal((await api.query('SELECT extensions.platform_probe() AS value')).rows[0].value,17);
      const grants=(await api.query("SELECT count(*)::int AS count FROM pg_class c CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege) WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND has_table_privilege(current_user,c.oid,p.privilege)")).rows[0].count;
      assert.equal(grants,0);await api.query('RESET ROLE');
    }
    await denied(runtime.query('SELECT * FROM public.launch05d_future_table'));
    await denied(runtime.query('SELECT public.launch05d_future_function()'));
    assert.equal((await owner.query('SELECT public.launch05d_future_function() AS value')).rows[0].value,1);
  }finally {
    await owner.query('DROP TABLE IF EXISTS public.launch05d_future_table; DROP SEQUENCE IF EXISTS public.launch05d_future_seq; DROP FUNCTION IF EXISTS public.launch05d_future_function()');
    await owner.end();await api.end();await runtime.end();
  }
});

test('Prisma restricted runtime supports inventory, media, settings, leads and their existing CRUD permissions',async()=>{
  const p=runtimePrisma();const suffix=randomUUID();
  try {
    const brand=await p.brand.create({data:{name:'Synthetic',slug:'synthetic-'+suffix}});
    const category=await p.vehicleCategory.create({data:{name:'Synthetic',slug:'category-'+suffix,type:'BODY_TYPE'}});
    const car=await p.car.create({data:{title:'Synthetic',slug:'car-'+suffix,brandId:brand.id,model:'Synthetic',year:2026,price:1,mileage:'0',bodyType:'SEDAN',fuelType:'OCTANE',transmission:'AUTOMATIC',condition:'RECONDITIONED',stockType:'RECONDITIONED'}});
    const image=await p.carImage.create({data:{carId:car.id,imageUrl:'https://example.invalid/synthetic.png'}});
    const feature=await p.carFeature.create({data:{carId:car.id,title:'Synthetic',type:'FEATURE'}});
    assert.equal((await p.car.findUnique({where:{id:car.id},include:{images:true,features:true,brand:true}})).images[0].id,image.id);
    await p.car.update({where:{id:car.id},data:{price:2}});await p.carImage.delete({where:{id:image.id}});await p.carFeature.delete({where:{id:feature.id}});
    await p.car.delete({where:{id:car.id}});await p.brand.delete({where:{id:brand.id}});await p.vehicleCategory.delete({where:{id:category.id}});
    const slide=await p.heroSlide.create({data:{title:'Synthetic',imageUrl:'https://example.invalid/synthetic.png'}});await p.heroSlide.update({where:{id:slide.id},data:{title:'Synthetic updated'}});await p.heroSlide.delete({where:{id:slide.id}});
    const media=await p.media.create({data:{fileName:'synthetic.png',fileUrl:'/synthetic.png',fileType:'image/png',folder:'media',size:1}});assert.ok(await p.media.findUnique({where:{id:media.id}}));await p.media.delete({where:{id:media.id}});
    const key='launch05d-'+suffix;await p.siteSetting.upsert({where:{key},create:{key,value:'synthetic'},update:{value:'synthetic'}});await p.siteSetting.upsert({where:{key},create:{key,value:'unused'},update:{value:'synthetic updated'}});assert.equal((await p.siteSetting.findUnique({where:{key}})).value,'synthetic updated');
    for(const [model,data,update] of [['sellCarLead',{name:'Synthetic',phone:'000',carName:'Synthetic'},{status:'REVIEWED'}],['requirementLead',{name:'Synthetic',phone:'000',carName:'Synthetic'},{status:'REVIEWED'}],['auctionSheetRequest',{name:'Synthetic',phone:'000',email:'synthetic@example.invalid',chassisNumber:'SYNTHETIC'},{status:'PROCESSING'}],['newsletterSubscriber',{email:suffix+'@example.invalid'},{isActive:false}]]) {
      const row=await p[model].create({data});assert.ok(await p[model].findUnique({where:{id:row.id}}));await p[model].update({where:{id:row.id},data:update});await p[model].delete({where:{id:row.id}});
    }
  }finally{await p.$disconnect();}
});

test('real restricted-runtime account locking prevents concurrent removal of the last super admin',async()=>{
  const p=runtimePrisma();try {
    const second=await p.adminUser.create({data:{name:'Synthetic second',email:randomUUID()+'@example.invalid',passwordHash:'synthetic-not-used',role:'SUPER_ADMIN'}});
    const load=createHarness({[path.resolve('lib/prisma.ts')]:{prisma:p},[path.resolve('lib/auth.ts')]:{auth:async()=>null},[path.resolve('lib/generated/prisma/client.ts')]:{Prisma}});
    const {withAdminAccountMutation}=await load('lib/adminAccountSafety.ts');
    const results=await Promise.allSettled(['launch05d-http-admin',second.id].map(id=>withAdminAccountMutation(id,tx=>tx.adminUser.update({where:{id},data:{role:'EDITOR'}}))));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
    assert.equal(await p.adminUser.count({where:{role:'SUPER_ADMIN',isActive:true}}),1);
    const active=await p.adminUser.findFirstOrThrow({where:{role:'SUPER_ADMIN',isActive:true}});
    await withAdminAccountMutation(active.id,tx=>tx.adminUser.update({where:{id:'launch05d-http-admin'},data:{role:'SUPER_ADMIN'}}));
    await withAdminAccountMutation('launch05d-http-admin',tx=>tx.adminUser.delete({where:{id:second.id}}));
  }finally{await p.$disconnect();}
});

test('runtime admin deletion retains narrowly allowed FK cleanup without granting audit UPDATE',async()=>{
  const {fixture}=await import('../employees/fixture.mjs');const f=await fixture();try {
    const actor=await f.prisma.adminUser.create({data:{name:'Synthetic cleanup actor',email:randomUUID()+'@example.invalid',passwordHash:'synthetic-not-used',role:'SUPER_ADMIN'}});
    f.setSubject(actor.id);const employee=await f.employee();const profile=await f.submitted(employee.id);const approval=await f.approved(employee.id,profile.revision);
    const event=await f.prisma.employeeAuditEvent.findFirstOrThrow({where:{employeeId:employee.id}});
    await f.call('changeEmployeeStatus',employee.id,{status:'INACTIVE'});
    await f.prisma.adminUser.delete({where:{id:actor.id}});
    const retained=await f.prisma.employeeAuditEvent.findUniqueOrThrow({where:{id:event.id}});assert.equal(retained.actorAdminId,null);assert.equal(retained.actorSnapshot,actor.id);
    assert.equal((await f.prisma.employeePublicationApproval.findUniqueOrThrow({where:{id:approval.id}})).decidedById,null);
    await assert.rejects(f.prisma.employeeAuditEvent.update({where:{id:event.id},data:{summary:'tamper'}}));
  }finally{await f.close();}
});

test('hardening fails atomically on an unpinned target or RLS-enabled table rather than disabling policy',async()=>{
  const owner=await connection();try {
    await owner.query('BEGIN');await owner.query("SELECT set_config('recon.hardening_target','wrong-target',true)");
    await assert.rejects(owner.query(fs.readFileSync('scripts/sql/launch05d/02-creator-defaults.sql','utf8')),error=>error.code==='P0001');await owner.query('ROLLBACK');
    await owner.query('BEGIN');await owner.query("SELECT set_config('recon.hardening_target',current_database(),true)");await owner.query('ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY');
    await assert.rejects(owner.query(fs.readFileSync('scripts/sql/launch05d/03-runtime-grants.sql','utf8')),error=>error.code==='P0001');await owner.query('ROLLBACK');
    assert.equal((await owner.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.\"Employee\"'::regclass")).rows[0].relrowsecurity,false);
  }finally{await owner.query('ROLLBACK').catch(()=>{});await owner.end();}
});
