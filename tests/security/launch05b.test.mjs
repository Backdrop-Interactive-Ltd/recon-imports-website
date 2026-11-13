import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {validateDisposable,transferCandidates} from '../../scripts/launch05b-rehearsal.mjs';

const target={host:'127.0.0.1',port:55432,database:'launch05b_123456abcdef',user:'launch05b_migrator',
  cluster:path.resolve('.local/launch05b/synthetic/postgres'),marker:'LAUNCH-05B isolated PostgreSQL 17 12345678-1234-1234-1234-123456789abc'};

test('rehearsal write targets exclude owner, remote, unmarked and out-of-workspace databases',()=>{
  assert.doesNotThrow(()=>validateDisposable(target));
  for(const change of [{host:'db.example.invalid'},{host:'localhost'},{port:54329},{port:'55432'},{database:'recon_local'},{database:'postgres'},
    {marker:''},{cluster:path.resolve('.local/postgres')},{user:'postgres'},{cluster:path.resolve('.local/launch05b-escape/postgres')}]) {
    assert.throws(()=>validateDisposable({...target,...change}));
  }
});

test('unsafe transfer targets fail before any SQL is issued',async()=>{
  let calls=0;
  const db={query:async()=>{calls++;throw Error('Unexpected SQL');}};
  await assert.rejects(transferCandidates(db,{...target,database:'recon_local'},{}));
  assert.equal(calls,0);
});
