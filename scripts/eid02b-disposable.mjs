import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { preserveTypeMetadata } from './build-isolation.mjs';

const task=['EID-03','DATA-02'].includes(process.env.RECON_DISPOSABLE_TASK) ? process.env.RECON_DISPOSABLE_TASK : 'EID-02B';
const slug={'EID-03':'eid03','EID-02B':'eid02b','DATA-02':'data02'}[task];
const manifestPath=resolve(`.local/${slug}-target.json`);
const mode=process.argv[2];
function describe(target) {
  console.log(JSON.stringify({ database:target.database, hostClassification:'new isolated loopback-only PostgreSQL cluster', port:target.port, purpose:`${task} disposable synthetic integration tests only`, connectionSource:`.local/${slug}-target.json; never .env` }));
}
function readTarget() {
  const target=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(target.task !== task || !new RegExp(`^${slug}_[a-f0-9]{12}$`).test(target.database) || !resolve(target.directory).startsWith(resolve(`.local/${slug}`)+ sep)) throw Error('Disposable target provenance invalid');
  for(const key of ['ownerUrl','runtimeUrl']) {
    const url=new URL(target[key]);
    if(url.hostname !== '127.0.0.1' || url.port !== String(target.port) || url.pathname !== `/${target.database}`) throw Error('Target URL mismatch');
  }
  return target;
}
async function verify(target) {
  describe(target);
  const client=new pg.Client({connectionString:target.ownerUrl});
  try {
    await client.connect();
    const result=await client.query("SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
    if(result.rows[0]?.name !== target.database || result.rows[0]?.marker !== target.marker) throw Error('Database marker mismatch');
    const roles=await client.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=current_user');
    if(Object.values(roles.rows[0]).some(Boolean)) throw Error('Test role is privileged beyond its disposable target');
  } finally { await client.end(); }
}
if(mode === 'init') {
  if(existsSync(manifestPath)) throw Error('A task manifest already exists; refusing to overwrite or reuse a pre-existing target');
  const tag=randomBytes(6).toString('hex');
  const directory=resolve(`.local/${slug}`,tag,'postgres');
  if(existsSync(directory)) throw Error('Refusing pre-existing cluster directory');
  const server=createServer();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port; await new Promise(r=>server.close(r));
  const database=`${slug}_${tag}`, marker=`${task} isolated disposable ${randomUUID()}`;
  const bootstrapPassword=randomBytes(24).toString('hex'), ownerPassword=randomBytes(24).toString('hex'), runtimePassword=randomBytes(24).toString('hex');
  const ownerUrl=`postgresql://eid02b_test:${ownerPassword}@127.0.0.1:${port}/${database}`;
  const runtimeUrl=`postgresql://eid02b_runtime:${runtimePassword}@127.0.0.1:${port}/${database}`;
  const target={task,database,directory,port,marker,ownerUrl,runtimeUrl};
  describe(target);
  console.log('Fresh cluster, fresh credentials, no existing connection string read. No production/shared instances are attached.');
  mkdirSync(resolve(`.local/${slug}`,tag),{recursive:true});
  const instance=new EmbeddedPostgres({databaseDir:directory,user:'eid02b_bootstrap',password:bootstrapPassword,port,persistent:true,authMethod:'scram-sha-256',autoRehydrateSymlinks:true,initdbFlags:['--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  await instance.initialise();
  writeFileSync(join(directory,'pg_hba.conf'),`host postgres eid02b_bootstrap 127.0.0.1/32 scram-sha-256\nhost ${database} eid02b_test,eid02b_runtime 127.0.0.1/32 scram-sha-256\nhost all all 127.0.0.1/32 reject\n`);
  await instance.start();
  const bootstrap=instance.getPgClient(); await bootstrap.connect();
  await bootstrap.query(`CREATE ROLE eid02b_test LOGIN PASSWORD '${ownerPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
  await bootstrap.query(`CREATE ROLE eid02b_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
  await bootstrap.query(`CREATE DATABASE "${database}" OWNER eid02b_test ENCODING 'UTF8' TEMPLATE template0`);
  await bootstrap.query(`REVOKE CONNECT ON DATABASE "${database}" FROM PUBLIC`);
  await bootstrap.query(`GRANT CONNECT ON DATABASE "${database}" TO eid02b_test,eid02b_runtime`);
  await bootstrap.query(`COMMENT ON DATABASE "${database}" IS '${marker}'`);
  await bootstrap.end();
  writeFileSync(manifestPath,JSON.stringify(target,null,2),{flag:'wx'});
  await verify(target);
  console.log('Disposable PostgreSQL ready. Test roles have no shared/production database credentials; HBA rejects every other database.');
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await instance.stop();process.exit(0);});
} else if(mode === 'run') {
  const target=readTarget(); await verify(target);
  const args=process.argv.slice(3);
  if(!args.length) throw Error('A command is required');
  const runtime=process.env.EID02B_RUNTIME === '1';
  const command=args.shift();
  const nodeArgs=command === 'prisma' ? [resolve('node_modules/prisma/build/index.js'),...args] : command === 'node' ? args : command === 'build' ? [resolve('node_modules/next/dist/bin/next'),'build'] : null;
  if(!nodeArgs) throw Error('Only prisma, node and build are supported');
  const restoreTypes = command === 'build' ? preserveTypeMetadata() : () => {};
  const child=spawn(process.execPath,nodeArgs,{stdio:'inherit',windowsHide:true,env:{...process.env,RECON_ISOLATED_BUILD:slug,DATABASE_URL:runtime?target.runtimeUrl:target.ownerUrl,EID02B_RUNTIME_URL:target.runtimeUrl,EID02B_DATABASE:target.database,EID02B_MARKER:target.marker,AUTH_SECRET:randomBytes(32).toString('hex')}});
  child.on('error',()=>{restoreTypes();console.error('Disposable command could not start.');process.exitCode=1;});
  child.on('exit',code=>{restoreTypes();process.exitCode=code??1;});
} else { throw Error('Use init or run; no existing database configuration is accepted'); }
