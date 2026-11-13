import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rootCertificates} from 'node:tls';
import {X509Certificate} from 'node:crypto';
import {validateTarget} from '../../scripts/launch05a-supabase-probe.mjs';
test('Supabase probe permits only a matching Session Pooler target with verified TLS and read-only defaults',()=>{
  const base={host:'aws-0-test.pooler.supabase.com',project:'abcdefghijklmnopqrst',user:'postgres.abcdefghijklmnopqrst',database:'postgres',port:5432,password:'synthetic-not-used'};
  const config=validateTarget(base);
  assert.equal(config.ssl.rejectUnauthorized,true);
  assert.match(config.options,/default_transaction_read_only=on/);
  for(const change of [{host:'127.0.0.1'},{host:'pooler.supabase.com.evil.invalid'},{host:'postgresql://secret@pooler.supabase.com'},{port:6543},{user:'postgres.zyxwvutsrqponmlkjihg'},{database:'recon_local'},{password:''},{project:''}])assert.throws(()=>validateTarget({...base,...change}));
});
test('optional operator-supplied CA is validated and never disables certificate verification',()=>{
  const base={host:'aws-0-test.pooler.supabase.com',project:'abcdefghijklmnopqrst',user:'postgres.abcdefghijklmnopqrst',database:'postgres',port:5432,password:'synthetic-not-used'};
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch05a-ca-'));
  const file=path.join(directory,'test-ca.crt');
  try{
    fs.writeFileSync(file,'not a certificate');
    assert.throws(()=>validateTarget({...base,caFile:file}));
    const valid=rootCertificates.find(pem=>{const c=new X509Certificate(pem);return c.ca&&Date.parse(c.validFrom)<Date.now()&&Date.parse(c.validTo)>Date.now();});
    assert.ok(valid);
    fs.writeFileSync(file,valid);
    const config=validateTarget({...base,caFile:file});
    assert.equal(config.ssl.rejectUnauthorized,true);
    assert.equal(new X509Certificate(config.ssl.ca).fingerprint256,new X509Certificate(valid).fingerprint256);
  }finally{
    assert.equal(path.dirname(directory),os.tmpdir());
    assert.ok(path.basename(directory).startsWith('recon-launch05a-ca-'));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
