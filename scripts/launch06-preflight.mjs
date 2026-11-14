import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
import {validateProduction,exportBackup} from './launch05g-backup.mjs';
import {inspectDatabase} from './launch05a-supabase-probe.mjs';
import {collectSecurity,assessSecurity} from './launch05c-preflight.mjs';

const previousReport=path.resolve('.local/launch05c/20261113223940233-security-379e14e7/preflight-result.json');
export function assertPreflight(baseline,security,input,previous){
  assert.equal(sha256([input.host,input.project,input.user,input.database].join('|')),previous.targetFingerprint,'Previously verified production target must match');
  assert.equal(baseline.migrationReadiness,'PRECHECKS_PASS_EXECUTION_NOT_AUTHORIZED');
  assert.equal(security.identity[0]?.current_role,input.user.slice(0,input.user.lastIndexOf('.')));
  assert.match(security.identity[0]?.version,/^17\./);assert.equal(security.identity[0]?.read_only,'on');
  assert.equal(security.identity[0]?.current_schema,'public');
  assert.equal(security.objects.length,0,'Public schema must still be empty');
  assert.equal(security.roles.filter(r=>['recon_migrator','recon_runtime'].includes(r.role)).length,0,'Unexpected existing application roles require review');
  const actor=security.roles.find(r=>r.role===security.identity[0]?.current_role);assert.equal(actor?.rolcreaterole,true);
  assert.ok(!security.schemaPrivileges.some(r=>['anon','authenticated','service_role','authenticator'].includes(r.role)&&r.schema==='public'&&r.create));
}
async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('preflight-backup','launch06'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assert.match(path.basename(run),/-preflight-backup-/);
  let input,config,db,raw='',stage='private input';
  try{
    assert.equal(fs.readdirSync(run).length,0,'Use a fresh private run for each attempt');
    for await(const chunk of process.stdin){raw+=chunk;if(raw.length>16384)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    assert.equal(input.encryptionPassword,input.confirmEncryptionPassword);assert.ok(input.encryptionPassword.length>=16);
    config=validateProduction(input);
    const previous=JSON.parse(fs.readFileSync(previousReport));assert.equal(previous.status,'READ_ONLY_PREFLIGHT_COMPLETE');
    assert.equal(sha256([input.host,input.project,input.user,input.database].join('|')),previous.targetFingerprint);
    stage='verified TLS read-only preflight';db=new pg.Client(config);await db.connect();assert.equal(db.connection.stream.authorized,true);
    await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const baseline=await inspectDatabase(db),security=await collectSecurity(db);assertPreflight(baseline,security,input,previous);
    const providerBefore={schemaAcl:security.schemaAcl,defaults:security.defaults,eventTriggers:security.eventTriggers,extensions:security.extensions};
    writeReport(run,'preflight-private.json',{status:'PRECHECKS_PASS_WRITES_NOT_AUTHORIZED',targetFingerprint:previous.targetFingerprint,baseline,security,providerBefore,assessment:assessSecurity(baseline,security),tlsVerified:true,tlsProtocol:db.connection.stream.getProtocol(),databaseWrites:0});
    await db.query('ROLLBACK');await db.end();db=null;
    stage='encrypted pre-change production export';
    const {result}=await exportBackup(config,run,input.encryptionPassword,{verifyIdentity:async(connection,identity)=>{
      assert.equal(identity.database,'postgres');assert.equal(identity.role,input.user.split('.')[0]);
      const current=await inspectDatabase(connection),catalog=await collectSecurity(connection);assertPreflight(current,catalog,input,previous);
    }});
    assert.equal(result.tableCount,0);assert.equal(result.migrationCount,0);
    writeReport(run,'prewrite-gate.json',{status:'AWAITING_RECOVERY_OFFSITE_AND_EXPLICIT_WRITE_AUTHORIZATION',productionTargetMatchesLAUNCH05C:true,postgresMajor:17,publicSchemaEmpty:true,applicationRolesAbsent:true,tlsVerified:true,encryptedBackupVerified:true,
      backupArtifacts:result.artifacts,ownerDataApiConfirmationRequired:true,independentRecoveryAccessRequired:true,ownerOffsiteRetentionConfirmationRequired:true,productionWrites:0,writeExecutorInvoked:false});
    console.log(JSON.stringify({status:'PREFLIGHT_AND_ENCRYPTED_BACKUP_VERIFIED',privateRun:run,publicTables:0,migrations:0,encryptedArtifacts:3,productionWrites:0,next:'STOP_FOR_OWNER_GATES'}));
  }catch(error){writeReport(run,'preflight-failure.json',{status:'STOPPED_SAFELY',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',productionWrites:0,automaticRetry:false});console.log(JSON.stringify({status:'STOPPED_SAFELY',stage,privateRun:run,productionWrites:0}));process.exitCode=1;}
  finally{await db?.end().catch(()=>{});raw='';if(input)for(const key of ['password','encryptionPassword','confirmEncryptionPassword'])input[key]='';if(config)config.password='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('LAUNCH-06 preflight stopped safely; sensitive details suppressed.');process.exitCode=1;});
