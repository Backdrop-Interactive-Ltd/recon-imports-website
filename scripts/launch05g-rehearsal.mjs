import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import nextEnv from '@next/env';
import pg from 'pg';
import {privateRun,writeReport,sha256,fingerprint,quoteIdentifier as qi} from './launch05a-common.mjs';
import {bin,exportBackup,applicationState,cleanPgEnvironment,command,mediaRecovery,mediaRun} from './launch05g-backup.mjs';
import {openJson,hashFile} from './launch05g-crypto.mjs';
import {unpackBackup} from './launch05g-decrypt.mjs';
const execute=promisify(execFile);
export function validateDisposable(target){
  assert.equal(target.host,'127.0.0.1');assert.ok(Number.isInteger(target.port)&&target.port>1024&&target.port<65536&&target.port!==54329);
  assert.match(target.database,/^launch05g_[a-f0-9]{12}$/);assert.match(target.marker,/^LAUNCH-05G disposable [a-f0-9-]{36}$/);
  assert.ok(path.resolve(target.cluster).startsWith(path.resolve('.local/launch05g')+path.sep));assert.equal(path.basename(target.cluster),'postgres');
  assert.equal(target.ssl.rejectUnauthorized,true);assert.ok(target.ssl.ca);
}
async function verify(db,target){validateDisposable(target);assert.equal(db.connection.stream.authorized,true);const row=(await db.query("SELECT current_database() AS database,current_user AS role,inet_server_port() AS port,current_setting('server_version') AS version,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];assert.equal(row.database,target.database);assert.equal(row.role,target.user);assert.equal(row.port,target.port);assert.equal(row.version,'17.11');assert.equal(row.marker,target.marker);if(row.role==='launch05g_bootstrap'){const location=(await db.query("SELECT current_setting('data_directory') AS directory")).rows[0];assert.equal(fs.realpathSync(location.directory),fs.realpathSync(target.cluster));}}
async function control(name,args){await new Promise((resolve,reject)=>{const child=spawn(path.join(bin,name+'.exe'),args,{stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Disposable server control failed')));});}
function filesToPreserve(){
  const rows=JSON.parse(fs.readFileSync(path.join(mediaRun,'files-before.json')));
  for(const root of [mediaRun,'.local/launch05a','.local/launch05b','.local/launch05c','.local/launch05d']){
    const scan=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(!['postgres','restore-cluster'].includes(entry.name))scan(file);}else if(/\.json$/.test(file))rows.push({file,sha256:sha256(fs.readFileSync(file))});}};scan(root);
  }
  for(const row of rows)assert.equal(sha256(fs.readFileSync(row.file)),row.sha256);return rows;
}
async function phase(db,database,file){await db.query('BEGIN');try{await db.query("SELECT set_config('recon.hardening_target',$1,true)",[database]);await db.query(fs.readFileSync('scripts/sql/launch05d/'+file,'utf8'));await db.query('COMMIT');}catch(error){await db.query('ROLLBACK');throw error;}}
async function mustDeny(db,sql,code){await db.query('BEGIN');try{await assert.rejects(()=>db.query(sql),error=>error.code===code);}finally{await db.query('ROLLBACK');}}
async function main(){
  const run=privateRun('restore-rehearsal','launch05g'),cluster=path.join(run,'postgres');let started=false,owner,bootstrap,port,ownerBefore,filesBefore,stage='preservation';const clients=[];
  try{
    filesBefore=filesToPreserve();writeReport(run,'preserved-files.json',filesBefore);mediaRecovery();
    const installer=path.join(path.dirname(path.dirname(bin)),'postgresql-17.11-4-windows-x64-binaries.zip');assert.equal(await hashFile(installer),'b9424ee7bc60b52450ff910a3630225df32e633f3cb29c1d126d9299d59aea28');
    for(const name of ['postgres','pg_dump','pg_restore'])assert.match((await command(name,['--version'])).stdout,/17\.11/);
    nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});const ownerUrl=new URL(process.env.DATABASE_URL);assert.equal(ownerUrl.hostname,'127.0.0.1');assert.equal(ownerUrl.port,'54329');assert.equal(ownerUrl.pathname,'/recon_local');
    owner=new pg.Client({connectionString:ownerUrl.toString(),options:'-c default_transaction_read_only=on -c statement_timeout=10000'});await owner.connect();await owner.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const ownIdentity=(await owner.query("SELECT current_database() AS database,current_setting('data_directory') AS directory,current_setting('transaction_read_only') AS readonly")).rows[0];assert.equal(ownIdentity.database,'recon_local');assert.equal(ownIdentity.readonly,'on');assert.equal(fs.realpathSync(ownIdentity.directory).toLowerCase(),fs.realpathSync('.local/postgres').toLowerCase());
    const before=await fingerprint(owner);ownerBefore=before;assert.equal(before.data.length,18);await owner.query('ROLLBACK');writeReport(run,'owner-before.json',before);
    stage='new isolated TLS PostgreSQL 17 cluster';
    const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));port=socket.address().port;await new Promise(r=>socket.close(r));assert.notEqual(port,54329);
    const cert=path.join(run,'server.crt'),key=path.join(run,'server.key'),certConfig=path.join(run,'openssl.cnf');fs.writeFileSync(certConfig,'[req]\ndistinguished_name=dn\n[dn]\n');
    await execute('C:/Program Files/Git/usr/bin/openssl.exe',['req','-config',certConfig,'-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','2','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-addext','basicConstraints=critical,CA:TRUE'],{windowsHide:true});
    const ssl={rejectUnauthorized:true,ca:fs.readFileSync(cert,'utf8')};const secret=randomBytes(32).toString('hex'),passfile=path.join(run,'bootstrap.secret');fs.writeFileSync(passfile,secret,{flag:'wx'});
    assert.ok(!fs.existsSync(cluster));await control('initdb',['-D',cluster,'-U','launch05g_bootstrap','--auth=scram-sha-256',`--pwfile=${passfile}`,'--encoding=UTF8']);
    const names=[0,1,2].map(()=>`launch05g_${randomBytes(6).toString('hex')}`);
    fs.writeFileSync(path.join(cluster,'pg_hba.conf'),`hostnossl all all 127.0.0.1/32 reject\nhostssl all launch05g_bootstrap 127.0.0.1/32 scram-sha-256\nhostssl ${names.join(',')} recon_migrator,recon_runtime 127.0.0.1/32 scram-sha-256\nhost all all 127.0.0.1/32 reject\n`);
    const quoteFile=file=>file.replaceAll('\\','/').replaceAll("'","''");fs.appendFileSync(path.join(cluster,'postgresql.conf'),`\nssl=on\nssl_cert_file='${quoteFile(cert)}'\nssl_key_file='${quoteFile(key)}'\nlog_statement='none'\nlog_min_error_statement='panic'\nlog_error_verbosity='terse'\n`);
    await control('pg_ctl',['-D',cluster,'-l',path.join(run,'postgres.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','-t','60','start']);started=true;
    bootstrap=new pg.Client({host:'127.0.0.1',port,database:'postgres',user:'launch05g_bootstrap',password:secret,ssl});await bootstrap.connect();assert.equal(bootstrap.connection.stream.authorized,true);
    const loc=(await bootstrap.query("SELECT current_setting('data_directory') AS directory,current_setting('server_version') AS version")).rows[0];assert.equal(fs.realpathSync(loc.directory),fs.realpathSync(cluster));assert.equal(loc.version,'17.11');
    await bootstrap.query('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE authenticator NOLOGIN');
    const targets=[];for(const database of names){await bootstrap.query(`CREATE DATABASE ${qi(database)} TEMPLATE template0 ENCODING 'UTF8'`);const marker='LAUNCH-05G disposable '+randomUUID();await bootstrap.query(`COMMENT ON DATABASE ${qi(database)} IS '${marker}'`);const target={host:'127.0.0.1',port,database,user:'launch05g_bootstrap',password:secret,ssl,marker,cluster};validateDisposable(target);targets.push(target);const db=new pg.Client(target);await db.connect();clients.push(db);await verify(db,target);await phase(db,database,'01-roles.sql');await db.query('CREATE SCHEMA auth; CREATE TABLE auth.recovery_sentinel(id integer PRIMARY KEY); INSERT INTO auth.recovery_sentinel VALUES(17)');}
    const migrationPassword=randomBytes(32).toString('hex'),runtimePassword=randomBytes(32).toString('hex');await bootstrap.query(`ALTER ROLE recon_migrator LOGIN PASSWORD '${migrationPassword}'; ALTER ROLE recon_runtime LOGIN PASSWORD '${runtimePassword}'`);
    const connect=async(index,user='recon_migrator')=>{const target={...targets[index],user,password:user==='recon_runtime'?runtimePassword:migrationPassword};const db=new pg.Client(target);await db.connect();clients.push(db);await verify(db,target);return {db,target};};
    stage='twelve immutable migrations in new source only';const source=await connect(0);await phase(source.db,source.target.database,'02-creator-defaults.sql');
    const cli=new URL(`postgresql://127.0.0.1:${port}/${source.target.database}`);cli.username='recon_migrator';cli.password=migrationPassword;cli.searchParams.set('sslmode','require');cli.searchParams.set('sslaccept','strict');cli.searchParams.set('sslcert',cert);
    const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!/^(DATABASE_URL|DIRECT_URL|AUTH_|NEXTAUTH_|CLOUDINARY_|ADMIN_)/.test(k)));
    try{await execute(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...clean,DATABASE_URL:cli.toString()},windowsHide:true,maxBuffer:4*1024*1024,timeout:300000});}catch{throw Object.assign(Error('Isolated migrations failed'),{code:'ISOLATED_MIGRATIONS_FAILED'});}
    await phase(source.db,source.target.database,'03-runtime-grants.sql');
    stage='synthetic history and sequence fixture';
    await source.db.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"updatedAt") VALUES ('g_admin','Synthetic recovery administrator','recovery@example.invalid','synthetic-not-a-login-hash','SUPER_ADMIN',now());
      INSERT INTO "Employee" (id,"employeeCode","employmentStatus","revisionCounter","updatedAt") VALUES ('g_employee','RI-EMP-'||nextval('recon_employee_official_code_seq'),'ACTIVE',1,now());
      INSERT INTO "EmployeePublicProfile" (id,"employeeId",revision,"publicName",designation,"createdById","updatedAt") VALUES ('g_profile','g_employee',1,'Synthetic history','Recovery fixture','g_admin',now());
      UPDATE "EmployeePublicProfile" SET state='SUBMITTED',"submittedById"='g_admin',"submittedBySnapshot"='Synthetic administrator',"submittedAt"=now() WHERE id='g_profile';
      INSERT INTO "EmployeeAuditEvent" (id,"employeeId","actorAdminId","actorSnapshot","actorRole","eventType","recordVersion",summary,"correlationId") VALUES ('g_audit','g_employee','g_admin','Synthetic administrator','SUPER_ADMIN','CREATED',1,'Synthetic recovery fixture','launch05g');
      INSERT INTO "SiteSetting" (id,key,value,type,"updatedAt") VALUES ('g_setting','recoveryFixture','synthetic','STRING',now());`);
    stage='consistent export, encryption and media preservation';const encryptionPassword=randomBytes(32).toString('base64');
    const exported=await exportBackup(source.target,run,encryptionPassword,{verifyIdentity:db=>verify(db,source.target)});assert.equal(exported.result.tableCount,24);assert.equal(exported.result.migrationCount,12);assert.equal(exported.result.sequencesStable,true);
    const metadata=openJson(path.join(run,'recovery-metadata.json.enc'),encryptionPassword),media=openJson(path.join(run,'media-recovery.json.enc'),encryptionPassword);assert.equal(media.assets.length,3);for(const asset of media.assets)assert.equal(sha256(Buffer.from(asset.base64,'base64')),asset.sourceSha256);
    // DPAPI escrow is rehearsal-only; production passphrases belong in an
    // independently recoverable password manager, never alongside backups.
    const protectedKey=await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-Command',"$s=ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force; try { ConvertFrom-SecureString $s } finally { $s.Dispose() }"],{stdio:['pipe','pipe','ignore'],windowsHide:true});let out='';child.stdout.on('data',data=>out+=data);child.once('error',reject);child.once('exit',code=>code===0?resolve(out.trim()):reject(Error('Rehearsal key escrow failed')));child.stdin.end(encryptionPassword);});fs.writeFileSync(path.join(run,'rehearsal-key.dpapi'),protectedKey,{flag:'wx'});
    stage='authenticated decryption and isolated full restore';const unpackedDir=path.join(run,'verified-decryption');fs.mkdirSync(unpackedDir);const unpacked=await unpackBackup(run,unpackedDir,encryptionPassword);const {archive,list}=unpacked;assert.deepEqual(unpacked.metadata,metadata);
    const restored=await connect(1);await phase(restored.db,restored.target.database,'02-creator-defaults.sql');assert.equal((await restored.db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0);
    const restoreConnection=cleanPgEnvironment(restored.target,run,{readonly:false});try{await verify(restored.db,restored.target);await command('pg_restore',['--single-transaction','--exit-on-error','--no-owner','--no-privileges',`--use-list=${list}`,'--dbname=service=recon_backup',archive],restoreConnection.env);}finally{restoreConnection.cleanup();}
    await restored.db.query('BEGIN READ ONLY');assert.deepEqual(await applicationState(restored.db),metadata.state);await restored.db.query('ROLLBACK');await phase(restored.db,restored.target.database,'03-runtime-grants.sql');
    const runtime=await connect(1,'recon_runtime');assert.equal((await runtime.db.query('SELECT count(*)::int AS n FROM "EmployeePublicProfile" WHERE state=\'SUBMITTED\'')).rows[0].n,1);
    await mustDeny(runtime.db,'UPDATE "EmployeeAuditEvent" SET summary=\'changed\'','42501');await mustDeny(runtime.db,'DELETE FROM "Employee"','42501');await mustDeny(runtime.db,"SELECT setval('recon_employee_official_code_seq',1)",'42501');
    await mustDeny(restored.db,`INSERT INTO "EmployeePublicProfile" (id,"employeeId",revision,state,"updatedAt") VALUES ('g_bad_replay','g_employee',2,'SUBMITTED',now())`,'P0001');
    await mustDeny(restored.db,`INSERT INTO "EmployeeAuditEvent" (id,"employeeId","actorSnapshot","actorRole","eventType","recordVersion",summary,"correlationId") VALUES ('g_bad_fk','missing','fixture','SUPER_ADMIN','CREATED',1,'fixture','fixture')`,'23503');
    assert.equal((await clients[1].query('SELECT id FROM auth.recovery_sentinel')).rows[0].id,17);
    for(const role of ['anon','authenticated','service_role'])assert.equal((await restored.db.query("SELECT has_table_privilege($1,'public.\"AdminUser\"','SELECT') AS permitted",[role])).rows[0].permitted,false);
    stage='repeat restore to another new empty target';const repeat=await connect(2);await phase(repeat.db,repeat.target.database,'02-creator-defaults.sql');const repeatConnection=cleanPgEnvironment(repeat.target,run,{readonly:false});try{await verify(repeat.db,repeat.target);await command('pg_restore',['--single-transaction','--exit-on-error','--no-owner','--no-privileges',`--use-list=${list}`,'--dbname=service=recon_backup',archive],repeatConnection.env);}finally{repeatConnection.cleanup();}
    await repeat.db.query('BEGIN READ ONLY');assert.deepEqual(await applicationState(repeat.db),metadata.state);await repeat.db.query('ROLLBACK');fs.unlinkSync(archive);fs.unlinkSync(list);
    stage='original preservation';await owner.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');assert.deepEqual(await fingerprint(owner),before);await owner.query('ROLLBACK');for(const row of filesBefore)assert.equal(sha256(fs.readFileSync(row.file)),row.sha256);
    const result={status:'VERIFIED',postgres:'17.11',source:'SYNTHETIC_NEW_DISPOSABLE_DATABASE',fullRestoreTargets:2,tables:metadata.state.data.length,migrations:metadata.state.history.length,constraints:metadata.state.constraints.length,indexes:metadata.state.indexes.length,guardTriggers:metadata.state.triggers.length,sequenceStateExact:true,submittedHistoryRestored:true,rowAndSchemaFingerprintsMatch:true,foreignKeyAndGuardDenials:true,runtimeAndApiPermissionsVerified:true,verifiedTLS:true,encryptedArchiveRoundtrip:true,separateMediaRecoveryAssets:3,publicSchemaConflictHandled:true,providerSentinelPreserved:true,ownerDatabaseUnchanged:true,originalFilesAndBackupsUnchanged:true,productionConnections:0,productionWrites:0,syntheticRehearsalKey:'WINDOWS_CURRENT_USER_DPAPI_ONLY_NOT_PRODUCTION_ESCROW'};
    writeReport(run,'rehearsal-result.json',result);console.log(JSON.stringify({status:'VERIFIED',report:path.join(run,'rehearsal-result.json'),restoreTargets:2,tables:result.tables,migrations:12,productionConnections:0}));
  }catch(error){writeReport(run,'rehearsal-failure.json',{status:'FAILED',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',productionWrites:0});console.log(JSON.stringify({status:'FAILED',stage,privateRun:run}));process.exitCode=1;}
  finally{
    if(owner&&ownerBefore&&filesBefore){try{await owner.query('ROLLBACK');await owner.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');assert.deepEqual(await fingerprint(owner),ownerBefore);await owner.query('ROLLBACK');for(const row of filesBefore)assert.equal(sha256(fs.readFileSync(row.file)),row.sha256);writeReport(run,'preservation.json',{ownerDatabaseUnchanged:true,originalFilesAndBackupsUnchanged:true});}catch{writeReport(run,'preservation.json',{ownerDatabaseUnchanged:'NOT_VERIFIED'});process.exitCode=1;}}
    for(const client of clients)await client.end().catch(()=>{});await bootstrap?.end().catch(()=>{});await owner?.end().catch(()=>{});
    if(started){const lines=fs.readFileSync(path.join(cluster,'postmaster.pid'),'utf8').split(/\r?\n/);assert.equal(path.resolve(lines[1]),path.resolve(cluster));assert.equal(Number(lines[3]),port);await control('pg_ctl',['-D',cluster,'-m','fast','-w','-t','60','stop']);console.log('Stopped only the new disposable PostgreSQL 17 cluster.');}
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Rehearsal stopped safely; sensitive details suppressed.');process.exitCode=1;});
