import test from 'node:test';import assert from 'node:assert/strict';
import {credentialPatch,preservedConfiguration,hyperdriveId} from '../../scripts/hyperdrive-runtime-update.mjs';
import {sha256} from '../../scripts/launch05a-common.mjs';
test('credential update changes only runtime user/password and pins the existing endpoint/cache',()=>{
  const origin={host:'synthetic.pooler.supabase.com',user:'postgres.abcdefghijklmnopqrst',port:5432,database:'postgres',scheme:'postgres'};
  const before={id:hyperdriveId,name:'recon-imports-production-db',origin,caching:{disabled:true},mtls:{sslmode:'verify-full'},origin_connection_limit:20};
  const fingerprint=sha256([origin.host,'abcdefghijklmnopqrst',origin.user,'postgres'].join('|')),snapshot=structuredClone(before);
  assert.deepEqual(credentialPatch(before,'synthetic-private-value',fingerprint),{origin:{user:'recon_runtime.abcdefghijklmnopqrst',password:'synthetic-private-value'}});assert.deepEqual(before,snapshot);
  for(const change of [{id:'other'},{caching:{disabled:false}},{origin:{...origin,host:'different.pooler.supabase.com'}},{origin:{...origin,user:'recon_migrator.abcdefghijklmnopqrst'}}])assert.throws(()=>credentialPatch({...before,...change},'synthetic-private-value',fingerprint));
  assert.deepEqual(preservedConfiguration(before),preservedConfiguration({...before,origin:{...origin,user:'recon_runtime.abcdefghijklmnopqrst'}}));
});
