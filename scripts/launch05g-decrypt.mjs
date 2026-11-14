import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
import {hashFile,decryptFile,openJson} from './launch05g-crypto.mjs';
import {reviewedRestoreList} from './launch05g-backup.mjs';

// Decrypts authenticated artifacts for a later, separately approved restore.
// This module never opens a database connection or executes restore SQL.
export async function unpackBackup(source,destination,password){
  const root=fs.realpathSync(source),index=JSON.parse(fs.readFileSync(path.join(root,'backup-index.json')));
  const names=['application.pgdump.enc','media-recovery.json.enc','recovery-metadata.json.enc'];
  assert.deepEqual(index.artifacts.map(r=>r.file).sort(),[...names].sort());assert.equal(index.pgMajor,17);
  for(const entry of index.artifacts){const file=fs.realpathSync(path.join(root,entry.file));assert.equal(path.dirname(file),root);assert.equal(await hashFile(file),entry.sha256);assert.equal(fs.statSync(file).size,entry.bytes);}
  const metadata=openJson(path.join(root,'recovery-metadata.json.enc'),password),media=openJson(path.join(root,'media-recovery.json.enc'),password);
  assert.equal(metadata.format,'RECON_APPLICATION_BACKUP_V1');assert.match(metadata.identity.version,/^17\./);
  assert.equal(media.mappingSha256,metadata.mediaMappingSha256);assert.equal(sha256(JSON.stringify(media.mapping,null,2)),media.mappingSha256);
  assert.deepEqual(media.assets.map(r=>r.key).sort(),['favicon','footerLogo','websiteLogo']);
  const archive=path.join(destination,'application.verified.custom');await decryptFile(path.join(root,'application.pgdump.enc'),archive,password);assert.equal(await hashFile(archive),metadata.plainSha256);
  const reviewed=reviewedRestoreList(metadata.toc);fs.writeFileSync(path.join(destination,'reviewed-toc.list'),reviewed.text,{flag:'wx',mode:0o600});
  for(const asset of media.assets){const bytes=Buffer.from(asset.base64,'base64');assert.equal(sha256(bytes),asset.sourceSha256);const mapped=media.mapping.records.find(r=>r.settingName===asset.key);assert.equal(mapped.mediaId,asset.mediaId);assert.equal(mapped.settingId,asset.settingId);fs.writeFileSync(path.join(destination,asset.key+'.png'),bytes,{flag:'wx',mode:0o600});}
  writeReport(destination,'recovery-metadata.private.json',metadata);writeReport(destination,'production-media-mapping.private.json',media.mapping);
  writeReport(destination,'decryption-verification.json',{status:'DECRYPTED_VERIFIED_NOT_RESTORED',archiveSha256:metadata.plainSha256,mediaAssets:3,mappingSha256:media.mappingSha256,databaseConnections:0,restoreSqlExecuted:false});
  return {metadata,archive,list:path.join(destination,'reviewed-toc.list')};
}
async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('decrypt-verified','launch05g'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch05g').toLowerCase());assert.match(path.basename(run),/-decrypt-verified-/);
  let input,raw='';try{for await(const chunk of process.stdin){raw+=chunk;if(raw.length>8192)throw Error('Input limit');}input=JSON.parse(raw);raw='';await unpackBackup(input.backupDirectory,run,input.encryptionPassword);console.log(JSON.stringify({status:'DECRYPTED_VERIFIED_NOT_RESTORED',privateRun:run,databaseConnections:0}));}
  catch{writeReport(run,'decryption-failure.json',{status:'DECRYPTION_STOPPED_SAFELY',restoreSqlExecuted:false});console.log('DECRYPTION_STOPPED_SAFELY; do not execute any partial output.');process.exitCode=1;}
  finally{raw='';if(input)input.encryptionPassword='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Decryption stopped safely; sensitive details suppressed.');process.exitCode=1;});
