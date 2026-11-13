import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {validateTarget} from '../../scripts/launch05d-rehearsal.mjs';

test('security rehearsal targets reject owner/remote/unmarked databases and unverified TLS',()=>{
  const target={host:'127.0.0.1',port:55432,database:'launch05d_123456abcdef',user:'recon_migrator',marker:'LAUNCH-05D isolated security 12345678-1234-1234-1234-123456789abc',cluster:path.resolve('.local/launch05d/synthetic/postgres'),ssl:{rejectUnauthorized:true,ca:'synthetic'}};
  assert.doesNotThrow(()=>validateTarget(target));
  for(const change of [{host:'db.example.invalid'},{port:54329},{database:'postgres'},{database:'recon_local'},{user:'unapproved'},{marker:'unverified'},
    {cluster:path.resolve('.local/postgres')},{ssl:{rejectUnauthorized:false,ca:'synthetic'}},{ssl:{rejectUnauthorized:true}}])assert.throws(()=>validateTarget({...target,...change}));
});

test('hardening stays scoped to dedicated roles and exact application models/enums without provider-wide revokes',()=>{
  const sql=['01-roles.sql','02-creator-defaults.sql','03-runtime-grants.sql'].map(file=>fs.readFileSync('scripts/sql/launch05d/'+file,'utf8'));
  for(const text of sql){assert.match(text,/recon\.hardening_target/);assert.doesNotMatch(text,/\bCASCADE\b(?!\.)|\bPASSWORD\s+'|ALTER ROLE\s+(?:postgres|supabase_)|FOR ROLE\s+(?:postgres|supabase_)|ON ALL (?:TABLES|FUNCTIONS|SEQUENCES) IN SCHEMA/i);}
  const schema=fs.readFileSync('prisma/schema.prisma','utf8'),grants=sql[2];
  const parse=name=>[...grants.match(new RegExp(name+' text\\[\\] := ARRAY\\[([^\\]]+)\\]'))[1].matchAll(/'([^']+)'/g)].map(m=>m[1]).sort();
  assert.deepEqual(parse('tables'),[...[...schema.matchAll(/^model (\w+) \{/gm)].map(m=>m[1]),'_prisma_migrations'].sort());
  assert.deepEqual(parse('enums'),[...schema.matchAll(/^enum (\w+) \{/gm)].map(m=>m[1]).sort());
});
