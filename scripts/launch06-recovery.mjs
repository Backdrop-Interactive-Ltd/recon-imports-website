import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
import {unpackBackup} from './launch05g-decrypt.mjs';
import {sealJson,openJson,hashFile} from './launch05g-crypto.mjs';
import {captureApprovedPayload} from './launch06-payload.mjs';
import {command} from './launch05g-backup.mjs';

async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('recovery-access','launch06'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assert.match(path.basename(run),/-recovery-access-/);
  let input,raw='',stage='private recovery input';
  try{
    assert.equal(fs.readdirSync(run).length,0);for await(const chunk of process.stdin){raw+=chunk;if(raw.length>8192)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    const source=fs.realpathSync(input.backupDirectory);assert.equal(path.dirname(source).toLowerCase(),path.resolve('.local/launch06').toLowerCase());
    const preflight=JSON.parse(fs.readFileSync(path.join(source,'preflight-private.json'))),gate=JSON.parse(fs.readFileSync(path.join(source,'prewrite-gate.json')));
    assert.equal(gate.productionWrites,0);assert.equal(preflight.status,'PRECHECKS_PASS_WRITES_NOT_AUTHORIZED');
    stage='independent key recovery and archive authentication';const recovered=await unpackBackup(source,run,input.encryptionPassword);
    assert.equal(recovered.metadata.state.data.length,0);assert.equal(recovered.metadata.state.history.length,0);
    assert.equal((await command('pg_restore',['--list',recovered.archive])).stdout,recovered.metadata.toc);
    stage='freeze exact approved owner payload read-only';const payload=await captureApprovedPayload();
    const encryptedPayload=path.join(run,'approved-candidates.json.enc');sealJson(payload,encryptedPayload,input.encryptionPassword);
    assert.equal(sha256(JSON.stringify(openJson(encryptedPayload,input.encryptionPassword).tables)),sha256(JSON.stringify(payload.tables)));
    const index=JSON.parse(fs.readFileSync(path.join(source,'backup-index.json')));
    const migrations=fs.readdirSync('prisma/migrations',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>({name:e.name,sha256:sha256(fs.readFileSync(`prisma/migrations/${e.name}/migration.sql`))})).sort((a,b)=>a.name.localeCompare(b.name));assert.equal(migrations.length,12);
    const hardening=['01-roles.sql','02-creator-defaults.sql','03-runtime-grants.sql'].map(file=>({file:'scripts/sql/launch05d/'+file,sha256:sha256(fs.readFileSync('scripts/sql/launch05d/'+file))}));
    const plan={task:'LAUNCH-06',status:'RECOVERY_AND_PAYLOAD_VERIFIED_WRITES_NOT_AUTHORIZED',backupRun:source,backupIndexSha256:sha256(fs.readFileSync(path.join(source,'backup-index.json'))),targetFingerprint:preflight.targetFingerprint,
      payloadFile:encryptedPayload,payloadCiphertextSha256:await hashFile(encryptedPayload),payloadTablesSha256:sha256(JSON.stringify(payload.tables)),mediaMappingSha256:payload.mediaMappingSha256,counts:payload.counts,historicalMediaExcluded:1,
      roles:['recon_migrator','recon_runtime'],migrations,hardening,independentRecoveryAccessVerified:true,productionWrites:0,offsiteConfirmed:false,explicitWriteAuthorization:false};
    writeReport(run,'approval-plan.json',plan);const planSha256=sha256(fs.readFileSync(path.join(run,'approval-plan.json')));writeReport(run,'approval-plan-checksum.json',{sha256:planSha256});
    stage='prepare encrypted off-site recovery set';const offsite=path.join(run,'offsite-recovery-set');fs.mkdirSync(offsite);
    for(const entry of index.artifacts)fs.copyFileSync(path.join(source,entry.file),path.join(offsite,entry.file),fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(source,'backup-index.json'),path.join(offsite,'backup-index.json'),fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(encryptedPayload,path.join(offsite,'approved-candidates.json.enc'),fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(run,'approval-plan.json'),path.join(offsite,'approval-plan.json'),fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(run,'approval-plan-checksum.json'),path.join(offsite,'approval-plan-checksum.json'),fs.constants.COPYFILE_EXCL);
    const artifacts=[];for(const file of fs.readdirSync(offsite))artifacts.push({file,bytes:fs.statSync(path.join(offsite,file)).size,sha256:await hashFile(path.join(offsite,file))});writeReport(offsite,'offsite-checksums.json',{artifacts});
    writeReport(run,'recovery-gate.json',{status:'RECOVERY_ACCESS_AND_PAYLOAD_VERIFIED',planSha256,counts:payload.counts,offsiteSourceDirectory:offsite,encryptedFiles:4,productionWrites:0,writeAuthorizationRequired:true});
    // The authenticated empty-schema plaintext archive is no longer needed.
    fs.unlinkSync(recovered.archive);
    console.log(JSON.stringify({status:'RECOVERY_ACCESS_AND_PAYLOAD_VERIFIED',privateRun:run,planSha256,encryptedOffsiteSet:offsite,rows:31,productionWrites:0}));
  }catch(error){writeReport(run,'recovery-failure.json',{status:'STOPPED_SAFELY',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',productionWrites:0});console.log(JSON.stringify({status:'STOPPED_SAFELY',stage,privateRun:run}));process.exitCode=1;}
  finally{raw='';if(input)input.encryptionPassword='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Recovery access check stopped safely; sensitive details suppressed.');process.exitCode=1;});
