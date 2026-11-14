import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import pg from 'pg';
import {createHash,X509Certificate} from 'node:crypto';
import {privateRun,writeReport,sha256,quoteIdentifier as qi} from './launch05a-common.mjs';
import {validateTarget as supabaseTarget} from './launch05a-supabase-probe.mjs';
import {encryptFile,decryptFile,hashFile,sealJson,openJson} from './launch05g-crypto.mjs';

const execute=promisify(execFile);
export const bin=path.join(process.env.LOCALAPPDATA??'','ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin');
export const mediaRun=path.resolve('.local/launch05f/20261114031132771-media-upload-45db51a9');
const inventoryFile=path.resolve('.local/launch05e/20261114020718301-media-inventory-e14cfacc/media-inventory.json');
export const appTables=[...fs.readFileSync('prisma/schema.prisma','utf8').matchAll(/^model (\w+) \{/gm)].map(m=>m[1]).concat('_prisma_migrations').sort();
export function validateProduction(input){
  assert.equal(input.project,input.confirmProject);assert.ok(input.caFile);assert.ok(!/[\r\n]/.test(input.caFile));
  assert.ok(!/[\r\n]/.test(input.password??''));assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0',false);
  const config=supabaseTarget(input);assert.ok(config.ssl.ca);config.application_name='recon-launch05g-readonly-backup';
  config.options='-c default_transaction_read_only=on -c row_security=off -c statement_timeout=60000';return config;
}
export function cleanPgEnvironment(config,run,{readonly=true}={}){
  const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('PG')&&!/^(DATABASE_URL|DIRECT_URL|AUTH_|NEXTAUTH_|CLOUDINARY_|ADMIN_)/.test(name)));
  const service=path.join(run,'connection.service.tmp'),passfile=path.join(run,'connection.pgpass.tmp'),cert=path.join(run,'connection-ca.tmp');
  const escape=value=>String(value).replaceAll('\\','\\\\').replaceAll(':','\\:');
  assert.ok(config.ssl.rejectUnauthorized&&config.ssl.ca);assert.ok(![config.host,config.user,config.database,config.password].some(v=>/[\r\n]/.test(v)));
  fs.writeFileSync(cert,config.ssl.ca,{flag:'wx',mode:0o600});
  fs.writeFileSync(service,`[recon_backup]\nhost=${config.host}\nport=${config.port}\ndbname=${config.database}\nuser=${config.user}\nsslmode=verify-full\nsslrootcert=${cert.replaceAll('\\','/')}\nconnect_timeout=12\n`,{flag:'wx',mode:0o600});
  fs.writeFileSync(passfile,`${[config.host,config.port,config.database,config.user,config.password].map(escape).join(':')}\n`,{flag:'wx',mode:0o600});
  return {env:{...env,PGSERVICEFILE:service,PGPASSFILE:passfile,PGOPTIONS:readonly?'-c default_transaction_read_only=on -c row_security=off':'-c row_security=off'},cleanup(){for(const file of [service,passfile,cert])if(fs.existsSync(file))fs.unlinkSync(file);}};
}
export async function command(name,args,env){
  try{return await execute(path.join(bin,name+'.exe'),args,{env,windowsHide:true,maxBuffer:16*1024*1024,timeout:300000});}
  catch{throw Object.assign(Error('PostgreSQL utility stopped; raw output suppressed'),{code:'POSTGRES_UTILITY_FAILED'});}
}
export function recoverySources(){
  const files=['prisma/schema.prisma','docs/deployment/launch-05d-security-hardening-rehearsal.md',...['01-roles.sql','02-creator-defaults.sql','03-runtime-grants.sql'].map(n=>'scripts/sql/launch05d/'+n)];
  for(const entry of fs.readdirSync('prisma/migrations',{withFileTypes:true}).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)))files.push(`prisma/migrations/${entry.name}/migration.sql`);
  return files.map(file=>({file,sha256:sha256(fs.readFileSync(file)),text:fs.readFileSync(file,'utf8')}));
}
export function mediaRecovery(){
  const inventory=JSON.parse(fs.readFileSync(inventoryFile)),mappingFile=path.join(mediaRun,'production-media-mapping.json');
  const mapping=JSON.parse(fs.readFileSync(mappingFile)),digest=JSON.parse(fs.readFileSync(path.join(mediaRun,'mapping-checksum.json')));
  assert.equal(sha256(fs.readFileSync(mappingFile)),digest.sha256);assert.equal(mapping.status,'VERIFIED_NOT_APPLIED');assert.equal(mapping.records.length,3);
  const assets=inventory.records.map(record=>{const bytes=fs.readFileSync(record.localFile),mapped=mapping.records.find(r=>r.settingName===record.key);assert.equal(sha256(bytes),record.sha256);assert.equal(mapped.mediaId,record.mediaId);assert.equal(mapped.settingId,record.settingId);return {key:record.key,mediaId:record.mediaId,settingId:record.settingId,sourceSha256:record.sha256,base64:bytes.toString('base64')};});
  return {mapping,mappingSha256:digest.sha256,inventory,assets};
}
export async function applicationState(db){
  await db.query("SET LOCAL TIME ZONE 'UTC'");
  const tables=(await db.query("SELECT c.relname AS name,c.relrowsecurity,c.relforcerowsecurity,c.relowner=current_user::regrole AS owns FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','f','m') ORDER BY c.relname")).rows;
  assert.ok(tables.every(t=>appTables.includes(t.name)));assert.ok(tables.every(t=>!t.relrowsecurity||t.owns&&!t.relforcerowsecurity));
  const data=[];for(const table of tables){
    const hash=createHash('sha256');let count=0;
    await db.query(`DECLARE recon_backup_rows NO SCROLL CURSOR FOR SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table.name)} t ORDER BY to_jsonb(t)::text COLLATE "C"`);
    try{for(;;){const batch=await db.query('FETCH FORWARD 512 FROM recon_backup_rows');if(!batch.rows.length)break;for(const row of batch.rows){if(count++)hash.update('\n');hash.update(row.canonical);}}}finally{await db.query('CLOSE recon_backup_rows');}
    data.push({table:table.name,rows:String(count),sha256:hash.digest('hex')});
  }
  const columns=(await db.query("SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  const indexes=(await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY indexname")).rows;
  const constraints=(await db.query("SELECT c.relname AS table_name,p.conname,p.contype,p.convalidated,pg_get_constraintdef(p.oid) AS definition FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname,p.conname")).rows;
  const triggers=(await db.query("SELECT c.relname AS table_name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal ORDER BY c.relname,t.tgname")).rows;
  const functions=(await db.query("SELECT proname,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY proname")).rows;
  const enums=(await db.query("SELECT t.typname,array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typnamespace='public'::regnamespace GROUP BY t.typname ORDER BY t.typname")).rows;
  const sequences=[];for(const {relname} of (await db.query("SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='S' ORDER BY relname")).rows){const values=(await db.query(`SELECT last_value::text,is_called FROM public.${qi(relname)}`)).rows[0];sequences.push({name:relname,...values});}
  const history=tables.some(t=>t.name==='_prisma_migrations')?(await db.query('SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public."_prisma_migrations" ORDER BY migration_name')).rows:[];
  return {data,columns,indexes,constraints,triggers,functions,enums,sequences,history};
}
export async function privilegeDocumentation(db){return {
  roles:(await db.query("SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname IN ('recon_migrator','recon_runtime') ORDER BY rolname")).rows,
  members:(await db.query("SELECT r.rolname AS role,m.rolname AS member,a.admin_option,a.inherit_option,a.set_option FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member WHERE r.rolname LIKE 'recon_%' OR m.rolname LIKE 'recon_%' ORDER BY r.rolname,m.rolname")).rows,
  defaults:(await db.query("SELECT pg_get_userbyid(defaclrole) AS creator,defaclobjtype,defaclnamespace::regnamespace::text AS schema,defaclacl::text AS acl FROM pg_default_acl WHERE pg_get_userbyid(defaclrole) IN ('recon_migrator','recon_runtime') ORDER BY creator,defaclobjtype,schema")).rows,
  tables:(await db.query("SELECT relname,pg_get_userbyid(relowner) AS owner,relacl::text AS acl,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p','S') ORDER BY relname")).rows,
  schema:(await db.query("SELECT nspname,nspacl::text AS acl FROM pg_namespace WHERE nspname='public'")).rows,
  passwordRecovery:'Role passwords are deliberately excluded; provision them privately from the separate credential vault.'};}

export async function exportBackup(config,run,password,{verifyIdentity}={}){
  let db,connection;const plain=path.join(run,'application.custom.partial');
  try{
    assert.ok(!fs.existsSync(plain),'A fresh export directory is required; existing partial archives are preserved.');
    const versions=await Promise.all(['pg_dump','pg_restore'].map(n=>command(n,['--version'])));assert.ok(versions.every(r=>/17\.11/.test(r.stdout)));
    db=new pg.Client({...config,options:'-c default_transaction_read_only=on -c row_security=off -c statement_timeout=60000'});await db.connect();
    assert.equal(db.connection.stream.authorized,true);await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await db.query("SELECT current_database() AS database,current_user AS role,current_setting('server_version') AS version,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.match(identity.version,/^17\./);assert.equal(identity.readonly,'on');await verifyIdentity(db,identity);
    const state=await applicationState(db),privileges=await privilegeDocumentation(db);
    const snapshot=(await db.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
    connection=cleanPgEnvironment(config,run);
    await command('pg_dump',['--format=custom','--schema=public','--strict-names','--no-privileges','--no-password',`--snapshot=${snapshot}`,`--file=${plain}`,'--dbname=service=recon_backup'],connection.env);
    const toc=(await command('pg_restore',['--list',plain])).stdout;assert.ok(toc.includes('SCHEMA - public'));
    const after=await applicationState(db);const sequencesStable=JSON.stringify(state.sequences)===JSON.stringify(after.sequences);
    await db.query('ROLLBACK');
    const plainSha256=await hashFile(plain),encrypted=await encryptFile(plain,path.join(run,'application.pgdump.enc'),password);
    const check=path.join(run,'roundtrip.custom.partial');await decryptFile(path.join(run,'application.pgdump.enc'),check,password);assert.equal(await hashFile(check),plainSha256);fs.unlinkSync(check);
    const media=mediaRecovery();sealJson(media,path.join(run,'media-recovery.json.enc'),password);assert.equal(openJson(path.join(run,'media-recovery.json.enc'),password).mappingSha256,media.mappingSha256);
    const metadata={format:'RECON_APPLICATION_BACKUP_V1',createdAt:new Date().toISOString(),identity,origin:{host:config.host,port:config.port,database:config.database,user:config.user,tlsVerified:true,caSha256:new X509Certificate(config.ssl.ca).fingerprint256},scope:'public application objects only; provider schemas/storage/role passwords excluded',state,privileges,sources:recoverySources(),
      sourceGitCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),plainSha256,toc,sequenceWatermarksAfter:after.sequences,sequencesStable,mediaMappingSha256:media.mappingSha256};
    sealJson(metadata,path.join(run,'recovery-metadata.json.enc'),password);assert.equal(openJson(path.join(run,'recovery-metadata.json.enc'),password).plainSha256,plainSha256);
    fs.unlinkSync(plain);
    const artifacts=[];for(const file of ['application.pgdump.enc','recovery-metadata.json.enc','media-recovery.json.enc'])artifacts.push({file,bytes:fs.statSync(path.join(run,file)).size,sha256:await hashFile(path.join(run,file))});
    const result={status:'EXPORTED_ENCRYPTED_RESTORE_NOT_YET_VERIFIED',artifacts,sequencesStable,pgMajor:17,archiveReadable:true,encryptedRoundtripVerified:true,tableCount:state.data.length,migrationCount:state.history.length};
    writeReport(run,'backup-index.json',result);return {result,metadata,encrypted};
  }finally{connection?.cleanup();await db?.end().catch(()=>{});}
}
export function reviewedRestoreList(toc){
  const removed=[];const lines=toc.split(/\r?\n/).map(line=>{
    if(/^\d+; \d+ \d+ SCHEMA - public \S+$/.test(line)||/^\d+; \d+ \d+ COMMENT - SCHEMA public \S+$/.test(line)){removed.push(line);return '; reviewed pre-existing public schema: '+line;}
    return line;
  });assert.ok(removed.some(line=>line.includes('SCHEMA - public')));return {text:lines.join('\n'),removedEntries:removed.length};
}
async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('production-export','launch05g'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch05g').toLowerCase());assert.match(path.basename(run),/-production-export-/);
  let raw='',input,config,stage='private input';
  try{
    assert.ok(!['backup-index.json','export-failure.json','application.custom.partial','application.pgdump.enc'].some(name=>fs.existsSync(path.join(run,name))));for await(const chunk of process.stdin){raw+=chunk;if(raw.length>16384)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    assert.equal(input.encryptionPassword,input.confirmEncryptionPassword);assert.ok(input.encryptionPassword.length>=16);
    config=validateProduction(input);stage='read-only TLS export and encryption';
    const {result}=await exportBackup(config,run,input.encryptionPassword,{verifyIdentity:async(db,identity)=>{assert.equal(identity.database,'postgres');assert.equal(identity.role,input.user.split('.')[0]);}});
    console.log(JSON.stringify({status:result.status,privateRun:run,encryptedArtifacts:3,tableCount:result.tableCount,migrationCount:result.migrationCount}));
  }catch(error){writeReport(run,'export-failure.json',{status:'EXPORT_STOPPED_SAFELY',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',productionWrites:0,automaticRetry:false});console.log('EXPORT_STOPPED_SAFELY; retain private evidence; no automatic retry.');process.exitCode=1;}
  finally{raw='';if(input)for(const name of ['password','encryptionPassword','confirmEncryptionPassword'])input[name]='';if(config)config.password='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Backup tool stopped safely; sensitive details suppressed.');process.exitCode=1;});
