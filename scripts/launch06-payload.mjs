import fs from 'node:fs';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {fingerprint,quoteIdentifier as qi} from './launch05a-common.mjs';
import {mapActiveMedia} from './launch05c-media.mjs';
import {mediaRecovery} from './launch05g-backup.mjs';

// Return only to the short-lived execution process. Never print or persist the
// plaintext credential/hash, and never fall back to sample/test passwords.
export async function readVerifiedLocalAdminPassword(admin,file='.env'){
  const values=dotenv.parse(fs.readFileSync(file));
  try{const password=values.ADMIN_PASSWORD;assert.ok(typeof password==='string'&&password.length>0);assert.equal(admin.role,'SUPER_ADMIN');assert.equal(admin.isActive,true);assert.equal(await bcrypt.compare(password,admin.passwordHash),true,'Saved local credential does not match the approved administrator');return password;}
  finally{for(const key of Object.keys(values))values[key]='';}
}

export function preparePayload(admins,settings,media,mapping){
  assert.equal(admins.length,1);assert.equal(admins[0].role,'SUPER_ADMIN');assert.equal(admins[0].isActive,true);assert.match(admins[0].passwordHash,/^\$2[aby]\$\d\d\$/);
  assert.equal(settings.length,27);assert.equal(media.length,4);
  const result=mapActiveMedia(settings,media,mapping.mappings,mapping.cloudName);
  assert.equal(result.media.length,3);assert.ok(result.media.every(row=>row.fileUrl.startsWith('https://res.cloudinary.com/')));
  assert.ok(result.settings.every(row=>!row.value.startsWith('/uploads/')),'Unmapped local upload references require review');
  return {AdminUser:structuredClone(admins),SiteSetting:result.settings.sort((a,b)=>a.id.localeCompare(b.id)),Media:result.media.sort((a,b)=>a.id.localeCompare(b.id))};
}
export async function captureApprovedPayload(){
  nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  const target=new URL(process.env.DATABASE_URL);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'54329');assert.equal(target.pathname,'/recon_local');
  const db=new pg.Client({connectionString:target.toString(),options:'-c default_transaction_read_only=on -c statement_timeout=10000'});
  try{
    await db.connect();await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await db.query("SELECT current_database() AS database,current_setting('data_directory') AS directory,current_setting('server_version') AS version,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.equal(identity.database,'recon_local');assert.match(identity.version,/^18\./);assert.equal(identity.readonly,'on');assert.equal(fs.realpathSync(identity.directory).toLowerCase(),fs.realpathSync('.local/postgres').toLowerCase());
    const sourceFingerprint=await fingerprint(db),approved=JSON.parse(fs.readFileSync('.local/launch05g/20261114081816233-restore-rehearsal-08823471/owner-before.json'));
    assert.deepEqual(sourceFingerprint,approved,'Owner records changed since the verified approval baseline');
    const rows={};for(const table of ['AdminUser','SiteSetting','Media'])rows[table]=(await db.query(`SELECT to_jsonb(t) AS row FROM public.${qi(table)} t ORDER BY id`)).rows.map(r=>r.row);
    const mediaBundle=mediaRecovery(),tables=preparePayload(rows.AdminUser,rows.SiteSetting,rows.Media,mediaBundle.mapping);
    await db.query('ROLLBACK');return {tables,sourceFingerprint,mediaMappingSha256:mediaBundle.mappingSha256,counts:{AdminUser:1,SiteSetting:27,Media:3},historicalMediaExcluded:1};
  }finally{await db.end().catch(()=>{});}
}
