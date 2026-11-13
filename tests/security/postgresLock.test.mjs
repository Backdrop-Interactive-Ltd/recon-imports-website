import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import pg from 'pg';
import path from 'node:path';
import { createHarness } from './moduleHarness.mjs';

test('actual PostgreSQL account-table lock serializes writers without changing any records', {
  skip: process.env.RUN_LOCAL_LOCK_TEST !== '1',
}, async () => {
  const url = new URL(process.env.DATABASE_URL);
  // Never run the integration probe against a hosted or production database.
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  assert.equal(url.port,'54329');
  assert.equal(url.pathname,'/recon_local');
  const first=new pg.Client({ connectionString:url.toString() });
  const second=new pg.Client({ connectionString:url.toString() });
  try {
    await first.connect(); await second.connect();
    await first.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await second.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await first.query('LOCK TABLE "AdminUser" IN SHARE ROW EXCLUSIVE MODE');
    await second.query("SET LOCAL lock_timeout = '2s'");
    let acquired=false;
    const waiting=second.query('LOCK TABLE "AdminUser" IN SHARE ROW EXCLUSIVE MODE').then(() => { acquired=true; });
    await new Promise(resolve => setTimeout(resolve,100));
    assert.equal(acquired,false);
    await first.query('ROLLBACK');
    await waiting;
    assert.equal(acquired,true);
    await second.query('ROLLBACK');
  } finally {
    await first.query('ROLLBACK').catch(() => {});
    await second.query('ROLLBACK').catch(() => {});
    await first.end(); await second.end();
  }
});

test('actual Prisma account-safety helper serializes transactions and validates existing actor without record mutations', {
  skip: process.env.RUN_LOCAL_LOCK_TEST !== '1',
}, async () => {
  const url=new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  assert.equal(url.port,'54329'); assert.equal(url.pathname,'/recon_local');
  const { prisma }=await import('../../lib/prisma.ts');
  try {
    const actor=await prisma.adminUser.findFirst({ where:{email:process.env.ADMIN_EMAIL,role:'SUPER_ADMIN',isActive:true},select:{id:true} });
    assert.ok(actor, 'Existing local seed admin is required; this test never creates accounts');
    const load=createHarness({
      [path.resolve('lib/prisma.ts')]:{prisma},
      [path.resolve('lib/auth.ts')]:{auth:async()=>null},
      'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}},
    });
    const { withAdminAccountMutation }=await load('lib/adminAccountSafety.ts');
    let running=0, maximum=0;
    await Promise.all([1,2].map(() => withAdminAccountMutation(actor.id,async () => {
      running++; maximum=Math.max(maximum,running);
      await new Promise(resolve=>setTimeout(resolve,75));
      running--; return 'read-only probe';
    })));
    assert.equal(maximum,1);
  } finally { await prisma.$disconnect(); }
});
