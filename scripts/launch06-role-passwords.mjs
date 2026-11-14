import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {X509Certificate} from 'node:crypto';
import pg from 'pg';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
import {openJson} from './launch05g-crypto.mjs';
import {validateProduction,cleanPgEnvironment} from './launch05g-backup.mjs';

const planDigest='1fd85b1571f607305cdbca13f743e264690ca851cade9099044af823df7918b9';
const names=['recon_migrator','recon_runtime'];
export function verifiedBackupMetadata(file,password,expectedSha256){
  assert.equal(sha256(fs.readFileSync(file)),expectedSha256);
  try{return openJson(file,password);}catch{throw Object.assign(Error('Backup key not verified; no production connection'),{code:'BACKUP_KEY_NOT_VERIFIED'});}
}
export function assertRuntimePasswordScope(approval){
  assert.equal(approval.task,'LAUNCH-06');assert.equal(approval.approvedPlanSha256,planDigest);
  assert.equal(approval.explicitRuntimePasswordWriteAuthorized,true);assert.equal(approval.role,'recon_runtime');assert.equal(approval.preserveMigratorPassword,true);
  for(const key of ['roleCreationAuthorized','migrationsAuthorized','importAuthorized','deploymentAuthorized','githubPushAuthorized'])assert.equal(approval[key],false);
}
export function requireRuntimePasswordAuthorization(directory,approvalDirectory=directory){
  privateDirectory(approvalDirectory);
  const planBytes=fs.readFileSync(path.join(directory,'approval-plan.json')),approval=JSON.parse(fs.readFileSync(path.join(approvalDirectory,'owner-runtime-password-only-authorization.json')));
  assert.equal(sha256(planBytes),planDigest);assertRuntimePasswordScope(approval);
  privateDirectory(path.dirname(approval.failureReceipt));assert.equal(path.basename(approval.failureReceipt),'wrapper-failure.json');
  assert.equal(sha256(fs.readFileSync(approval.failureReceipt)),approval.failureReceiptSha256);
}
export function missingRolePasswords(state){
  assert.deepEqual(state.roles.map(r=>r.rolname),names);
  assert.equal(state.publicObjects,0);assert.equal(state.migrationHistoryPresent,false);
  for(const role of state.roles){assert.equal(role.rolcanlogin,true);assert.equal(typeof role.passwordSet,'boolean','Password state is unverified; stop');}
  return state.roles.filter(r=>!r.passwordSet).map(r=>r.rolname);
}
export function requirePasswordOnlyAuthorization(authorization,state,stateHash,holdHash){
  const missing=missingRolePasswords(state);
  assert.equal(authorization.task,'LAUNCH-06');assert.equal(authorization.approvedPlanSha256,planDigest);
  assert.equal(authorization.explicitPasswordOnlyWritesAuthorized,true);
  assert.equal(authorization.inspectionSha256,stateHash);assert.equal(authorization.holdSha256,holdHash);
  assert.deepEqual(authorization.roles,missing);assert.ok(missing.length>0);
  assert.equal(authorization.migrationsAuthorized,false);assert.equal(authorization.importAuthorized,false);
  return missing;
}
function privateDirectory(value){const dir=fs.realpathSync(value);assert.equal(path.dirname(dir).toLowerCase(),path.resolve('.local/launch06').toLowerCase());return dir;}
export async function verifyReadOnlyRoleLogin(config,role,password,observe=()=>{},createClient=value=>new pg.Client(value)){
  assert.ok(names.includes(role));let login,inTransaction=false;
  try{
    observe({stage:'role-authentication',role});login=createClient({...config,user:role+'.'+config.user.split('.')[1],password});
    login.on?.('error',()=>{});await login.connect();observe({stage:'role-tls',passwordAuthenticationSucceeded:true});assert.equal(login.connection.stream.authorized,true);
    const identity=(await login.query("SELECT current_user AS role,current_database() AS database,current_setting('server_version') AS version,current_setting('transaction_read_only') AS readonly")).rows[0];
    observe({stage:'role-identity',tlsVerified:true,reportedRoleMatches:identity.role===role,startupReadOnly:identity.readonly==='on'});
    assert.equal(identity.role,role);assert.equal(identity.database,'postgres');assert.match(identity.version,/^17\./);
    // Poolers may omit startup session options. Enforce the verification's
    // read-only boundary explicitly instead of treating that as bad credentials.
    observe({stage:'explicit-read-only-transaction'});await login.query('BEGIN READ ONLY');inTransaction=true;
    const readonly=(await login.query("SELECT current_setting('transaction_read_only') AS readonly")).rows[0].readonly;assert.equal(readonly,'on');
    observe({stage:'role-login-verified',explicitTransactionReadOnly:true});
    return {role,passwordPresent:true,readOnlyLoginVerified:true,tlsVerified:true,startupReadOnly:identity.readonly==='on',explicitTransactionReadOnly:true};
  }finally{if(inTransaction)await login.query('ROLLBACK').catch(()=>{});await login?.end().catch(()=>{});}
}
async function inspect(db){
  await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
  try{
    const identity=(await db.query("SELECT current_database() AS database,current_user AS role,current_setting('server_version') AS version,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.equal(identity.database,'postgres');assert.match(identity.version,/^17\./);assert.equal(identity.readonly,'on');
    const roles=(await db.query('SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=ANY($1) ORDER BY rolname',[names])).rows;
    const readable=(await db.query("SELECT has_column_privilege('pg_catalog.pg_authid','rolpassword','SELECT') AS allowed")).rows[0].allowed;
    const passwordStates=readable?(await db.query('SELECT rolname,rolpassword IS NOT NULL AS present FROM pg_authid WHERE rolname=ANY($1)',[names])).rows:[];
    const publicObjects=Number((await db.query("SELECT (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace)+(SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace)+(SELECT count(*) FROM pg_type WHERE typnamespace='public'::regnamespace) AS n")).rows[0].n);
    const migrationHistoryPresent=(await db.query("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present")).rows[0].present;
    return {status:'READ_ONLY_PASSWORD_INSPECTION',tlsVerified:true,postgresVersion:identity.version,publicObjects,migrationHistoryPresent,roles:roles.map(r=>({...r,passwordSet:passwordStates.find(p=>p.rolname===r.rolname)?.present??null})),productionWrites:0};
  }finally{await db.query('ROLLBACK');}
}
async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('role-password-check','launch06'));return;}
  if(process.argv[2]==='--check-runtime-write-authorization'){requireRuntimePasswordAuthorization(privateDirectory(process.argv[3]),process.argv[4]?privateDirectory(process.argv[4]):privateDirectory(process.argv[3]));console.log('RUNTIME_PASSWORD_ONLY_AUTHORIZATION_VERIFIED');return;}
  const run=privateDirectory(process.argv[2]);let input,raw='',db,config,state,stage='private-input',loginDiagnostic={};
  try{
    for await(const chunk of process.stdin){raw+=chunk;if(raw.length>16384)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    assert.ok(['inspect','inspect-login','prepare-passwords','after','final'].includes(input.mode));stage='private-target-verification';
    const dir=privateDirectory(input.planDirectory),execution=privateDirectory(input.executionDirectory);
    const planBytes=fs.readFileSync(path.join(dir,'approval-plan.json')),plan=JSON.parse(planBytes);assert.equal(sha256(planBytes),planDigest);
    const provision=JSON.parse(fs.readFileSync(path.join(execution,'provision-completed.json')));assert.equal(provision.planSha256,planDigest);
    for(const name of ['migrations-started.json','import-completed.json','completion.json'])assert.ok(!fs.existsSync(path.join(execution,name)),'Later operations must remain stopped');
    const hold=fs.readFileSync(path.join(dir,'password-setup-only-hold.json'));
    stage='backup-key-verification';
    const indexBytes=fs.readFileSync(path.join(plan.backupRun,'backup-index.json'));assert.equal(sha256(indexBytes),plan.backupIndexSha256);
    const index=JSON.parse(indexBytes),metadataFile=path.join(plan.backupRun,'recovery-metadata.json.enc');
    const metadata=verifiedBackupMetadata(metadataFile,input.encryptionPassword,index.artifacts.find(item=>item.file==='recovery-metadata.json.enc').sha256);
    const origin=metadata.origin,project=origin.user.split('.')[1];stage='target-and-certificate-verification';
    assert.equal(sha256([origin.host,project,origin.user,origin.database].join('|')),plan.targetFingerprint);
    assert.equal(new X509Certificate(fs.readFileSync(input.caFile)).fingerprint256,origin.caSha256);
    config=validateProduction({host:origin.host,project,confirmProject:project,user:origin.user,database:origin.database,port:origin.port,password:input.operatorPassword,caFile:input.caFile});
    stage='operator-read-only-connection';db=new pg.Client(config);db.on('error',()=>{});await db.connect();assert.equal(db.connection.stream.authorized,true);
    stage='operator-identity';
    assert.equal((await db.query('SELECT current_user AS role')).rows[0].role,origin.user.split('.')[0]);
    stage='read-only-password-state';state=await inspect(db);
    if(input.mode==='inspect'||input.mode==='inspect-login'){
      writeReport(run,'state-before.json',state);
      if(input.mode==='inspect-login'){
        const role='recon_migrator';stage='existing-migrator-password-presence';
        assert.equal(state.roles.find(r=>r.rolname===role)?.passwordSet,true,'Existing migrator password is absent or unverified');
        const verified=await verifyReadOnlyRoleLogin(config,role,input.rolePassword,details=>{Object.assign(loginDiagnostic,details);stage=details.stage;});
        writeReport(run,'verified-'+role+'.json',verified);
        writeReport(run,'existing-login-check.json',{status:'MIGRATOR_LOGIN_VERIFIED',...verified,passwordSetupSkipped:true,missingPasswords:missingRolePasswords(state),productionWrites:0});
        console.log('MIGRATOR_LOGIN_VERIFIED; existing password preserved; no production writes.');return;
      }
      console.log(JSON.stringify({...state,privateRun:run}));return;
    }
    stage='fresh-password-authorization';
    const inspection=privateDirectory(input.inspectionDirectory),beforeBytes=fs.readFileSync(path.join(inspection,'state-before.json')),before=JSON.parse(beforeBytes);
    const authorization=JSON.parse(fs.readFileSync(path.join(inspection,'owner-password-only-authorization.json')));
    const missing=requirePasswordOnlyAuthorization(authorization,before,sha256(beforeBytes),sha256(hold));
    stage='role-state-drift-check';assert.deepEqual(state.roles.map(({passwordSet,...rest})=>rest),before.roles.map(({passwordSet,...rest})=>rest));
    assert.equal(state.publicObjects,0);assert.equal(state.migrationHistoryPresent,false);
    for(const role of before.roles.filter(r=>r.passwordSet))assert.equal(state.roles.find(r=>r.rolname===role.rolname).passwordSet,true);
    if(input.mode==='prepare-passwords'){
      const pending=missingRolePasswords(state);assert.ok(pending.every(role=>missing.includes(role)),'Unapproved password change; stop');
      if(pending.length)cleanPgEnvironment(config,run,{readonly:false});
      writeReport(run,'password-scope.json',{roles:pending,inspectionDirectory:inspection,planSha256:planDigest,authorizationSha256:sha256(fs.readFileSync(path.join(inspection,'owner-password-only-authorization.json'))),alreadyConfiguredRoles:names.filter(role=>!pending.includes(role))});
      console.log(JSON.stringify({status:'PASSWORD_ONLY_AUTHORIZATION_VERIFIED',roles:pending}));
    }else if(input.mode==='after'){
      stage='password-presence';assert.ok(names.includes(input.role));assert.equal(state.roles.find(r=>r.rolname===input.role).passwordSet,true);
      const verified=await verifyReadOnlyRoleLogin(config,input.role,input.rolePassword,details=>{Object.assign(loginDiagnostic,details);stage=details.stage;});
      writeReport(run,'verified-'+input.role+'.json',verified);
      console.log(input.role+': PASSWORD_AND_READ_ONLY_LOGIN_VERIFIED');
    }else{
      assert.equal(missingRolePasswords(state).length,0);
      for(const role of names)assert.equal(JSON.parse(fs.readFileSync(path.join(run,'verified-'+role+'.json'))).readOnlyLoginVerified,true);
      const actuallyPending=JSON.parse(fs.readFileSync(path.join(run,'password-scope.json'))).roles;
      writeReport(run,'password-setup-completed.json',{status:'PASSWORD_SETUP_VERIFIED',rolesUpdated:actuallyPending,rolesRecreated:false,migrationsExecuted:0,recordsImported:0,readOnlyLoginVerified:true,state});
      if(input.continuationRequested===true)writeReport(execution,'password-setup-verified.json',{directory:run,completionSha256:sha256(fs.readFileSync(path.join(run,'password-setup-completed.json'))),authorizationSha256:sha256(fs.readFileSync(path.join(inspection,'owner-password-only-authorization.json'))),continuationAuthorizationFile:path.join(inspection,'owner-post-password-continuation-authorization.json')});
      console.log('PASSWORD_SETUP_VERIFIED');
    }
  }catch(error){const role=input?.mode==='inspect-login'?'recon_migrator':names.includes(input?.role)?input.role:null;writeReport(run,'failure-'+(input?.mode??'input')+'.json',{status:'STOPPED_SAFELY',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',role,passwordPresent:state?.roles.find(r=>r.rolname===role)?.passwordSet??null,loginDiagnostic,verificationProductionWrites:0,automaticRetry:false});console.log('STOPPED_SAFELY; inspect sanitized private receipt.');process.exitCode=1;}
  finally{await db?.end().catch(()=>{});raw='';if(config)config.password='';if(input)for(const key of ['encryptionPassword','operatorPassword','rolePassword'])input[key]='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Stopped safely; sensitive details suppressed.');process.exitCode=1;});
