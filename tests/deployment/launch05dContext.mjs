import assert from 'node:assert/strict';
import path from 'node:path';
import pg from 'pg';
import {createRequire} from 'node:module';
import {PrismaPg} from '@prisma/adapter-pg';
const require=createRequire(import.meta.url);
export const {PrismaClient,Prisma}=require('../../lib/generated/prisma/client.ts');

export function targetUrl(name='DATABASE_URL') {
  assert.equal(process.env.LAUNCH05D_ACTIVE,'1');
  const value=process.env[name];const u=new URL(value);
  assert.equal(u.hostname,'127.0.0.1');assert.notEqual(u.port,'54329');
  assert.match(u.pathname,/^\/eid03_[a-f0-9]{12}$/);
  assert.equal(u.searchParams.get('sslmode'),'verify-full');
  assert.ok(path.resolve(u.searchParams.get('sslrootcert')).startsWith(path.resolve('.local/launch05d')+path.sep));
  assert.ok(['recon_migrator','recon_runtime','authenticator'].includes(u.username));
  return value;
}
export async function connection(name='DATABASE_URL') {
  const db=new pg.Client({connectionString:targetUrl(name),connectionTimeoutMillis:3000,query_timeout:10000});await db.connect();
  assert.equal(db.connection.stream.authorized,true);
  const row=(await db.query("SELECT current_setting('server_version') AS version,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];
  assert.equal(row.version,'17.11');assert.equal(row.marker,process.env.EID02B_MARKER);
  return db;
}
export function runtimePrisma(){return new PrismaClient({adapter:new PrismaPg({connectionString:targetUrl('EID02B_RUNTIME_URL')}),log:[]});}
