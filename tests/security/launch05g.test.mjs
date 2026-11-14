import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomBytes} from 'node:crypto';
import {rootCertificates} from 'node:tls';
import {X509Certificate} from 'node:crypto';
import {encryptFile,decryptFile,hashFile,sealJson,openJson} from '../../scripts/launch05g-crypto.mjs';
import {validateProduction,reviewedRestoreList,cleanPgEnvironment,exportBackup} from '../../scripts/launch05g-backup.mjs';
import {validateDisposable} from '../../scripts/launch05g-rehearsal.mjs';
const passphrase='synthetic-only-long-passphrase';
test('an existing partial archive stops export before any utility or database connection and is preserved',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch05g-partial-'));const file=path.join(dir,'application.custom.partial');
  try{fs.writeFileSync(file,'synthetic previous evidence');await assert.rejects(()=>exportBackup({},dir,passphrase));assert.equal(fs.readFileSync(file,'utf8'),'synthetic previous evidence');}finally{assert.equal(path.dirname(dir),os.tmpdir());fs.rmSync(dir,{recursive:true,force:true});}
});
test('authenticated encryption preserves archive bytes and rejects wrong keys, corruption and overwriting',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch05g-crypto-'));
  try{
    const plain=path.join(dir,'source'),encrypted=path.join(dir,'encrypted'),restored=path.join(dir,'restored');fs.writeFileSync(plain,randomBytes(100000));
    await encryptFile(plain,encrypted,passphrase);await decryptFile(encrypted,restored,passphrase);assert.equal(await hashFile(plain),await hashFile(restored));
    await assert.rejects(()=>encryptFile(plain,encrypted,passphrase));
    const originalRestoredHash=await hashFile(restored);await assert.rejects(()=>decryptFile(encrypted,restored,passphrase));assert.equal(await hashFile(restored),originalRestoredHash);
    const rejected=path.join(dir,'rejected');await assert.rejects(()=>decryptFile(encrypted,rejected,'wrong-but-long-passphrase'));assert.equal(fs.existsSync(rejected),false);
    const bytes=fs.readFileSync(encrypted);bytes[40]^=1;fs.writeFileSync(path.join(dir,'tampered'),bytes);await assert.rejects(()=>decryptFile(path.join(dir,'tampered'),rejected,passphrase));assert.equal(fs.existsSync(rejected),false);
    sealJson({privateFixture:'never logged'},path.join(dir,'metadata'),passphrase);assert.deepEqual(openJson(path.join(dir,'metadata'),passphrase),{privateFixture:'never logged'});
    assert.throws(()=>openJson(path.join(dir,'metadata'),'wrong-but-long-passphrase'));assert.throws(()=>sealJson({},path.join(dir,'short'),'short'));
  }finally{assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('recon-launch05g-crypto-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('independent encryption uses fresh salt and nonce even for identical data',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch05g-nonce-'));
  try{sealJson({same:true},path.join(dir,'a'),passphrase);sealJson({same:true},path.join(dir,'b'),passphrase);assert.notDeepEqual(fs.readFileSync(path.join(dir,'a')),fs.readFileSync(path.join(dir,'b')));}finally{assert.equal(path.dirname(dir),os.tmpdir());fs.rmSync(dir,{recursive:true,force:true});}
});
test('production target requires confirmed Supabase Session Pooler and verified CA, never localhost or transaction pooling',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch05g-target-'));const ca=path.join(dir,'ca.crt');
  try{
    fs.writeFileSync(ca,rootCertificates.find(pem=>{const c=new X509Certificate(pem);return c.ca&&Date.parse(c.validTo)>Date.now()&&Date.parse(c.validFrom)<Date.now();}));
    const input={host:'aws-0-test.pooler.supabase.com',project:'abcdefghijklmnopqrst',confirmProject:'abcdefghijklmnopqrst',user:'postgres.abcdefghijklmnopqrst',port:5432,database:'postgres',password:'synthetic-not-used',caFile:ca};
    const config=validateProduction(input);assert.equal(config.ssl.rejectUnauthorized,true);assert.match(config.options,/default_transaction_read_only=on/);assert.match(config.options,/row_security=off/);
    for(const change of [{host:'127.0.0.1'},{host:'pooler.supabase.com.evil.invalid'},{confirmProject:'other'},{port:6543},{caFile:''},{password:'bad\nvalue'},{database:'recon_local'}])assert.throws(()=>validateProduction({...input,...change}));
    const child=cleanPgEnvironment(config,dir);assert.equal(child.env.PGPASSWORD,undefined);assert.ok(child.env.PGPASSFILE);assert.ok(!fs.readFileSync(child.env.PGSERVICEFILE,'utf8').includes(input.password));assert.match(fs.readFileSync(child.env.PGSERVICEFILE,'utf8'),/sslmode=verify-full/);child.cleanup();assert.equal(fs.existsSync(child.env.PGPASSFILE),false);
  }finally{assert.equal(path.dirname(dir),os.tmpdir());fs.rmSync(dir,{recursive:true,force:true});}
});
test('TOC review removes only public schema creation/comment while preserving all application objects and original order',()=>{
  const toc='; Archive header\n5; 2615 2200 SCHEMA - public owner\n6; 0 0 COMMENT - SCHEMA public owner\n7; 1259 1 TABLE public Employee owner\n8; 0 1 TABLE DATA public Employee owner\n9; 2620 2 TRIGGER public Employee employee_guard owner\n';
  const result=reviewedRestoreList(toc);assert.equal(result.removedEntries,2);assert.ok(result.text.includes('\n7; 1259 1 TABLE public Employee owner'));assert.ok(result.text.includes('\n8; 0 1 TABLE DATA public Employee owner'));assert.ok(result.text.includes('\n9; 2620 2 TRIGGER public Employee employee_guard owner'));assert.throws(()=>reviewedRestoreList('7; 1259 1 TABLE public Employee owner'));
});
test('restore rehearsal target cannot select production, owner port, unknown database or an existing outside cluster',()=>{
  const target={host:'127.0.0.1',port:55001,database:'launch05g_012345abcdef',marker:'LAUNCH-05G disposable 00000000-0000-0000-0000-000000000000',cluster:path.resolve('.local/launch05g/synthetic/postgres'),ssl:{rejectUnauthorized:true,ca:'synthetic'}};
  assert.doesNotThrow(()=>validateDisposable(target));for(const change of [{host:'db.production.invalid'},{port:54329},{database:'recon_local'},{cluster:path.resolve('.local/postgres')},{marker:'unknown'},{ssl:{rejectUnauthorized:false,ca:'synthetic'}}])assert.throws(()=>validateDisposable({...target,...change}));
});
