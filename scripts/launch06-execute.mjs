import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {X509Certificate} from 'node:crypto';
import pg from 'pg';
import {PrismaPg} from '@prisma/adapter-pg';
import {privateRun,writeReport,sha256,quoteIdentifier as qi} from './launch05a-common.mjs';
import {validateProduction,cleanPgEnvironment,applicationState,exportBackup} from './launch05g-backup.mjs';
import {openJson,hashFile} from './launch05g-crypto.mjs';
import {inspectDatabase} from './launch05a-supabase-probe.mjs';
import {collectSecurity} from './launch05c-preflight.mjs';
import {assertPreflight} from './launch06-preflight.mjs';
import {captureApprovedPayload,readVerifiedLocalAdminPassword} from './launch06-payload.mjs';
import {createHarness} from '../tests/security/moduleHarness.mjs';
const execute=promisify(execFile),require=createRequire(import.meta.url);

export function requireWriteAuthorization(plan,planSha256,authorization){
  assert.equal(authorization?.task,'LAUNCH-06');assert.equal(authorization?.approvedPlanSha256,planSha256);
  for(const key of ['explicitProductionWritesAuthorized','offsiteRetentionConfirmed','independentRecoveryVerified','dataApiOffConfirmed'])assert.equal(authorization?.[key],true);
  if(authorization.explicitContinuationAuthorized===true){assert.equal(authorization.roleProvisioningCompleted,true);assert.equal(authorization.roleCreationAuthorized,false);}else assert.equal(authorization.roleLoginProvisioningAuthorized,true);
  assert.deepEqual(plan.counts,{AdminUser:1,SiteSetting:27,Media:3});assert.equal(plan.migrations.length,12);assert.equal(plan.hardening.length,3);
  assert.deepEqual(plan.roles,['recon_migrator','recon_runtime']);
}
export function executionAuthorization(directory,operation){
  const stop=path.join(directory,'owner-stopped-operation.json');
  const hold=path.join(directory,'password-setup-only-hold.json');
  const held=fs.existsSync(hold);
  if(held)assert.equal(operation,'migrate-import','Completed role provisioning must never be repeated');
  let authorizationFile=path.join(directory,held?'owner-post-password-continuation-authorization.json':fs.existsSync(stop)?'owner-resume-authorization.json':'owner-write-authorization.json');
  if(held){
    const execution=JSON.parse(fs.readFileSync(hold)).executionDirectory;
    if(execution){
      const executionPath=fs.realpathSync(execution);assert.equal(path.dirname(executionPath).toLowerCase(),path.resolve('.local/launch06').toLowerCase());
      const verifiedFile=path.join(executionPath,'password-setup-verified.json');
      if(fs.existsSync(verifiedFile)){
        const scoped=JSON.parse(fs.readFileSync(verifiedFile)).continuationAuthorizationFile;
        if(scoped){authorizationFile=fs.realpathSync(scoped);assert.equal(path.basename(authorizationFile),'owner-post-password-continuation-authorization.json');assert.equal(path.dirname(path.dirname(authorizationFile)).toLowerCase(),path.resolve('.local/launch06').toLowerCase());}
      }
    }
  }
  const authorization=JSON.parse(fs.readFileSync(authorizationFile));
  if(held){assert.equal(authorization.explicitContinuationAuthorized,true);assert.equal(authorization.holdSha256,sha256(fs.readFileSync(hold)));}
  if(fs.existsSync(stop)){assert.equal(authorization.explicitResumeAuthorized,true,'Fresh resume approval is required');assert.equal(authorization.supersedesStopSha256,sha256(fs.readFileSync(stop)),'Resume approval must bind the retained stop record');}
  return authorization;
}
export function assertExecutionNotStopped(directory,operation){
  if(fs.existsSync(path.join(directory,'password-setup-only-hold.json'))){
    const authorization=executionAuthorization(directory,operation),plan=fs.readFileSync(path.join(directory,'approval-plan.json'));
    requireWriteAuthorization(JSON.parse(plan),sha256(plan),authorization);
    const execution=fs.realpathSync(authorization.executionDirectory);assert.equal(path.dirname(execution).toLowerCase(),path.resolve('.local/launch06').toLowerCase());
    const verified=JSON.parse(fs.readFileSync(path.join(execution,'password-setup-verified.json'))),passwordRun=fs.realpathSync(verified.directory);
    assert.equal(path.dirname(passwordRun).toLowerCase(),path.resolve('.local/launch06').toLowerCase());
    const receipt=fs.readFileSync(path.join(passwordRun,'password-setup-completed.json'));
    assert.equal(sha256(receipt),verified.completionSha256);assert.equal(verified.authorizationSha256,authorization.passwordAuthorizationSha256);
    assert.equal(JSON.parse(receipt).status,'PASSWORD_SETUP_VERIFIED');assert.equal(JSON.parse(receipt).readOnlyLoginVerified,true);
    assert.ok(!fs.existsSync(path.join(execution,'migrations-started.json')),'Migrations already started; stop rather than repeat');return;
  }
  if(!fs.existsSync(path.join(directory,'owner-stopped-operation.json')))return;
  const text=fs.readFileSync(path.join(directory,'approval-plan.json'));requireWriteAuthorization(JSON.parse(text),sha256(text),executionAuthorization(directory));
}
async function loadContext(input){
  const directory=fs.realpathSync(input.planDirectory);assert.equal(path.dirname(directory).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assert.match(path.basename(directory),/-recovery-access-/);
  assertExecutionNotStopped(directory,input.phase);
  const text=fs.readFileSync(path.join(directory,'approval-plan.json')),plan=JSON.parse(text),digest=sha256(text),authorization=executionAuthorization(directory,input.phase);
  requireWriteAuthorization(plan,digest,authorization);
  assert.equal(sha256(fs.readFileSync(path.join(plan.backupRun,'backup-index.json'))),plan.backupIndexSha256);
  const index=JSON.parse(fs.readFileSync(path.join(plan.backupRun,'backup-index.json')));for(const entry of index.artifacts)assert.equal(await hashFile(path.join(plan.backupRun,entry.file)),entry.sha256);
  assert.equal(path.dirname(plan.payloadFile),directory);assert.equal(await hashFile(plan.payloadFile),plan.payloadCiphertextSha256);
  const payload=openJson(plan.payloadFile,input.encryptionPassword);assert.equal(sha256(JSON.stringify(payload.tables)),plan.payloadTablesSha256);
  for(const item of plan.migrations)assert.equal(sha256(fs.readFileSync(`prisma/migrations/${item.name}/migration.sql`)),item.sha256);
  for(const item of plan.hardening)assert.equal(sha256(fs.readFileSync(item.file)),item.sha256);
  const metadata=openJson(path.join(plan.backupRun,'recovery-metadata.json.enc'),input.encryptionPassword),origin=metadata.origin,project=origin.user.split('.')[1];
  assert.equal(sha256([origin.host,project,origin.user,origin.database].join('|')),plan.targetFingerprint);
  assert.equal(new X509Certificate(fs.readFileSync(input.caFile)).fingerprint256,origin.caSha256);
  const credentialConfig=(role,password)=>validateProduction({host:origin.host,project,confirmProject:project,user:role+'.'+project,database:'postgres',port:5432,password,caFile:input.caFile});
  return {directory,plan,digest,authorization,payload,origin,credentialConfig};
}
async function connect(config,role){const db=new pg.Client(config);db.on('error',()=>{});await db.connect();assert.equal(db.connection.stream.authorized,true);const identity=(await db.query("SELECT current_database() AS database,current_user AS role,current_setting('server_version') AS version")).rows[0];assert.equal(identity.database,'postgres');assert.equal(identity.role,role);assert.match(identity.version,/^17\./);return db;}
async function providerState(db){return (await db.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.kind,t.name,t.detail),'[]'::jsonb)::text AS state FROM (
  SELECT 'schema' AS kind,nspname AS name,coalesce(nspacl::text,'') AS detail FROM pg_namespace WHERE nspname IN ('auth','storage','extensions')
  UNION ALL SELECT 'relation',n.nspname||'.'||c.relname,coalesce(c.relacl::text,'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','storage','extensions')
  UNION ALL SELECT 'function',n.nspname||'.'||p.proname,coalesce(p.proacl::text,'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','storage','extensions')
  UNION ALL SELECT 'default',d.defaclobjtype::text||':'||d.defaclnamespace::text,coalesce(d.defaclacl::text,'') FROM pg_default_acl d WHERE pg_get_userbyid(d.defaclrole) NOT IN ('recon_migrator','recon_runtime')) t`)).rows[0].state;}
async function phase(db,ctx,file,extra=''){
  requireWriteAuthorization(ctx.plan,ctx.digest,ctx.authorization);await db.query('BEGIN READ WRITE');
  try{await db.query("SELECT set_config('recon.hardening_target','postgres',true)");await db.query(fs.readFileSync('scripts/sql/launch05d/'+file,'utf8'));if(extra)await db.query(extra);await db.query('COMMIT');}catch(error){await db.query('ROLLBACK');throw error;}
}
export async function importApprovedRows(db,ctx){
  requireWriteAuthorization(ctx.plan,ctx.digest,ctx.authorization);assert.equal(sha256(JSON.stringify(ctx.payload.tables)),ctx.plan.payloadTablesSha256);
  for(const table of ['AdminUser','SiteSetting','Media'])assert.equal(ctx.payload.tables[table].length,ctx.plan.counts[table]);
  await db.query('BEGIN READ WRITE');
  let inserted=0,skipped=0;
  try{
    await db.query("SET LOCAL TIME ZONE 'UTC'");await db.query("SELECT pg_advisory_xact_lock(hashtext('recon-launch06-approved-import'))");
    for(const table of ['AdminUser','SiteSetting','Media']){
      const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows.map(r=>r.column_name);
      const expected=[];
      for(const row of ctx.payload.tables[table]){
        assert.deepEqual(Object.keys(row).sort(),[...columns].sort());
        const value=JSON.stringify(row),canonical=(await db.query(`SELECT to_jsonb(r)::text AS canonical FROM jsonb_populate_record(NULL::public.${qi(table)},$1::jsonb) r`,[value])).rows[0].canonical;expected.push(canonical);
        const old=(await db.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t WHERE id=$1`,[row.id])).rows[0];
        if(old){assert.equal(old.canonical,canonical,'Conflicting existing row; import aborted');skipped++;}
        else{const names=columns.map(qi).join(',');await db.query(`INSERT INTO public.${qi(table)} (${names}) SELECT ${names} FROM jsonb_populate_record(NULL::public.${qi(table)},$1::jsonb)`,[value]);inserted++;}
      }
      const actual=(await db.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t`)).rows.map(r=>r.canonical).sort();assert.deepEqual(actual,expected.sort());
    }
    for(const table of (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename).filter(n=>!['AdminUser','SiteSetting','Media','_prisma_migrations'].includes(n)))assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${qi(table)}`)).rows[0].n,0);
    assert.equal(inserted+skipped,31);await db.query('COMMIT');return {inserted,skipped,rows:31,exactFieldVerification:true};
  }catch(error){await db.query('ROLLBACK');throw error;}
}
async function authenticateRuntime(config,payload,password){
  const {PrismaClient}=require('../lib/generated/prisma/client.ts');const prisma=new PrismaClient({adapter:new PrismaPg(config)});let authConfig;
  try{
    const load=createHarness({'next-auth':{default:config=>{authConfig=config;return {}; }},'next-auth/providers/credentials':{default:config=>config},'@auth/prisma-adapter':{PrismaAdapter:()=>({})},[path.resolve('lib/prisma.ts')]:{prisma}});
    await load('lib/auth.ts');const admin=payload.tables.AdminUser[0],provider=authConfig.providers[0];
    const user=await provider.authorize({email:admin.email,password});assert.equal(user?.id,admin.id);assert.equal(user?.role,'SUPER_ADMIN');
    const invalid=(password.startsWith('x')?'y':'x')+password.slice(1);assert.equal(await provider.authorize({email:admin.email,password:invalid}),null);
    assert.equal((await prisma.siteSetting.findMany()).length,27);assert.equal((await prisma.media.findMany()).length,3);
    const actual=await prisma.adminUser.findUnique({where:{id:admin.id}});assert.equal(actual.passwordHash,admin.passwordHash);
    return {realCredentialsAuthorizeCallback:true,prismaRuntimeReads:true,passwordHashPreserved:true,invalidPasswordDenied:true,httpCookieFlow:'NOT_TESTED'};
  }finally{await prisma.$disconnect();}
}
async function nativeMigrations(config,input,run){
  const url=new URL(`postgresql://${config.host}:5432/postgres`);url.username=config.user;url.password=config.password;url.searchParams.set('sslmode','require');url.searchParams.set('sslaccept','strict');url.searchParams.set('sslcert',input.caFile);
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!/^(DATABASE_URL|DIRECT_URL|AUTH_|NEXTAUTH_|ADMIN_|CLOUDINARY_|HYPERDRIVE)/.test(k)));
  for(const operation of ['deploy','status']){
    try{await execute(process.execPath,['node_modules/prisma/build/index.js','migrate',operation],{env:{...env,DATABASE_URL:url.toString()},windowsHide:true,maxBuffer:8*1024*1024,timeout:300000});}
    catch(error){const match=(String(error.stdout??'')+String(error.stderr??'')).match(/\bP\d{4}\b/);writeReport(run,'migration-error.json',{operation,code:match?.[0]??'PRISMA_COMMAND_FAILED',automaticRetry:false,historyRepairAttempted:false});throw Object.assign(Error('Prisma migration command stopped'),{code:match?.[0]??'PRISMA_COMMAND_FAILED'});}
  }
}
async function main(){
  if(process.argv[2]==='--check-authorization'){
    const directory=fs.realpathSync(process.argv[3]);assert.equal(path.dirname(directory).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assertExecutionNotStopped(directory);
    const text=fs.readFileSync(path.join(directory,'approval-plan.json'));requireWriteAuthorization(JSON.parse(text),sha256(text),executionAuthorization(directory));console.log('FRESH_OWNER_AUTHORIZATION_VERIFIED');return;
  }
  if(process.argv[2]==='--prepare'){console.log(privateRun('execution','launch06'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assert.match(path.basename(run),/-execution-/);
  let input,raw='',db,rt,stage='explicit authorization and private credentials';
  try{
    for await(const chunk of process.stdin){raw+=chunk;if(raw.length>16384)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    const ctx=await loadContext(input);if(ctx.authorization.explicitContinuationAuthorized===true)assert.equal(fs.realpathSync(ctx.authorization.executionDirectory),run);input.adminPassword=await readVerifiedLocalAdminPassword(ctx.payload.tables.AdminUser[0]);
    const {adminLoginSchema}=await import('../lib/validations/auth.ts');assert.equal(adminLoginSchema.safeParse({email:ctx.payload.tables.AdminUser[0].email,password:input.adminPassword}).success,true);
    assert.equal(sha256(JSON.stringify((await captureApprovedPayload()).tables)),ctx.plan.payloadTablesSha256);
    if(input.phase==='provision'){
      assert.ok(!fs.existsSync(path.join(run,'provision-started.json')));writeReport(run,'provision-started.json',{planSha256:ctx.digest});
      stage='fresh production read-only preflight';const config=ctx.credentialConfig(ctx.origin.user.split('.')[0],input.operatorPassword);db=await connect(config,ctx.origin.user.split('.')[0]);await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
      const baseline=await inspectDatabase(db),security=await collectSecurity(db);const previous=JSON.parse(fs.readFileSync('.local/launch05c/20261113223940233-security-379e14e7/preflight-result.json'));
      assertPreflight(baseline,security,{host:config.host,project:config.user.split('.')[1],user:config.user,database:'postgres'},previous);
      const grantable=(await db.query("SELECT has_database_privilege(current_user,current_database(),'CONNECT WITH GRANT OPTION') AS connect,has_schema_privilege(current_user,'public','USAGE WITH GRANT OPTION') AS usage,has_schema_privilege(current_user,'public','CREATE WITH GRANT OPTION') AS create")).rows[0];assert.ok(Object.values(grantable).every(Boolean));
      const providerBefore=await providerState(db);await db.query('ROLLBACK');
      writeReport(run,'provider-before.json',{state:providerBefore});
      stage='authorized new role provisioning';await phase(db,ctx,'01-roles.sql','ALTER ROLE recon_migrator LOGIN; ALTER ROLE recon_runtime LOGIN;');assert.equal(await providerState(db),providerBefore);
      writeReport(run,'provision-completed.json',{status:'ROLES_CREATED_AWAITING_PRIVATE_NATIVE_PASSWORD_SETUP',planSha256:ctx.digest,roles:['recon_migrator','recon_runtime'],schemaMigrationsApplied:0});
      cleanPgEnvironment(config,run,{readonly:false}); // Short-lived bridge for native psql \password; PowerShell removes these files in finally.
      console.log('ROLES_CREATED_AWAITING_PRIVATE_NATIVE_PASSWORD_SETUP');
    }else if(input.phase==='migrate-import'){
      assert.equal(JSON.parse(fs.readFileSync(path.join(run,'provision-completed.json'))).planSha256,ctx.digest);assert.ok(!fs.existsSync(path.join(run,'migrations-started.json')));
      stage='restricted role TLS login verification';const migConfig=ctx.credentialConfig('recon_migrator',input.migratorPassword),runtimeConfig=ctx.credentialConfig('recon_runtime',input.runtimePassword);db=await connect(migConfig,'recon_migrator');rt=await connect(runtimeConfig,'recon_runtime');
      const flags=(await rt.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=current_user")).rows[0];assert.ok(Object.values(flags).every(v=>v===false));
      const providerBefore=JSON.parse(fs.readFileSync(path.join(run,'provider-before.json'))).state;assert.equal(await providerState(db),providerBefore);
      stage='authorized private creator defaults';await phase(db,ctx,'02-creator-defaults.sql');
      writeReport(run,'migrations-started.json',{planSha256:ctx.digest,migrations:12});stage='twelve immutable Prisma migrations';await nativeMigrations(migConfig,input,run);
      stage='schema and grants';await db.query('BEGIN READ ONLY');const state=await applicationState(db);await db.query('ROLLBACK');
      assert.deepEqual(state.history.map(r=>r.migration_name),ctx.plan.migrations.map(r=>r.name));for(const row of state.history){assert.ok(row.finished&&!row.rolled_back);assert.equal(row.checksum,ctx.plan.migrations.find(m=>m.name===row.migration_name).sha256);}
      const reference=JSON.parse(fs.readFileSync('.local/launch05g/20261114081816233-restore-rehearsal-08823471/verified-decryption/recovery-metadata.private.json')).state;
      for(const key of ['columns','indexes','constraints','triggers','functions','enums'])assert.deepEqual(state[key],reference[key]);assert.equal(state.data.length,24);assert.ok(state.data.every(r=>r.table==='_prisma_migrations'||r.rows==='0'));
      await phase(db,ctx,'03-runtime-grants.sql');const security=await collectSecurity(db);assert.ok(security.tablePrivileges.every(r=>!r.allowed));assert.ok(!security.schemaPrivileges.some(r=>r.role==='recon_runtime'&&r.create));assert.equal(await providerState(db),providerBefore);
      stage='approved 31-row atomic import';const imported=await importApprovedRows(db,ctx);writeReport(run,'import-completed.json',imported);
      stage='runtime authentication and final integrity';const authentication=await authenticateRuntime(runtimeConfig,ctx.payload,input.adminPassword);await db.query('BEGIN READ ONLY');const final=await applicationState(db);await db.query('ROLLBACK');
      assert.deepEqual(final.sequences,state.sequences);assert.equal(final.history.length,12);assert.equal(sha256(JSON.stringify((await captureApprovedPayload()).tables)),ctx.plan.payloadTablesSha256);
      stage='encrypted post-import production snapshot';const postBackup=path.join(run,'post-import-backup');fs.mkdirSync(postBackup);
      const backup=await exportBackup(migConfig,postBackup,input.encryptionPassword,{verifyIdentity:async(connection,identity)=>{assert.equal(identity.database,'postgres');assert.equal(identity.role,'recon_migrator');}});assert.equal(backup.result.tableCount,24);assert.equal(backup.result.migrationCount,12);
      writeReport(run,'completion.json',{status:'PRODUCTION_DATABASE_VERIFIED',planSha256:ctx.digest,counts:ctx.plan.counts,migrations:12,tables:24,constraints:final.constraints.length,indexes:final.indexes.length,guards:final.triggers.length,sequenceAllocationsConsumed:0,authentication,providerObjectsAndDefaultsPreserved:true,localOwnerDatabaseUnchanged:true,uploadedMediaChanged:false,postImportEncryptedBackup:postBackup,hyperdriveRuntimeOrigin:'OWNER_CONFIGURATION_REQUIRED',deployedCookiesAndCallbacks:'NOT_TESTED'});
      console.log('PRODUCTION_DATABASE_VERIFIED');
    }else throw Error('Unknown execution phase');
  }catch(error){writeReport(run,'execution-failure-'+(input?.phase==='provision'?'provision':'migration')+'.json',{status:'STOPPED_SAFELY',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',automaticRetry:false,resetAttempted:false,historyRepairAttempted:false});console.log(JSON.stringify({status:'STOPPED_SAFELY',stage,privateRun:run}));process.exitCode=1;}
  finally{await db?.end().catch(()=>{});await rt?.end().catch(()=>{});raw='';if(input)for(const key of ['operatorPassword','encryptionPassword','migratorPassword','runtimePassword','adminPassword'])input[key]='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('LAUNCH-06 stopped safely; sensitive details suppressed.');process.exitCode=1;});
