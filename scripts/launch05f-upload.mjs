import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import nextEnv from '@next/env';
import pg from 'pg';
import {privateRun,sha256,writeReport,fingerprint} from './launch05a-common.mjs';
import {planAsset} from './launch05e-media-plan.mjs';
import {mapActiveMedia} from './launch05c-media.mjs';
import {cloudinaryClient,uploadApprovedAssets,validateUploadCredentials,inspectImage} from './launch05f-cloudinary.mjs';

const inventoryFile=path.resolve('.local/launch05e/20261114020718301-media-inventory-e14cfacc/media-inventory.json');
function fileState(inventory) {
  const files=[];
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else files.push(file);}}
  files.push(...fs.readdirSync('.').filter(name=>/^\.env(?:\.|$)/.test(name)).sort());walk('public/uploads');walk('prisma/migrations');
  files.push(...inventory.backups.map(row=>row.file));
  return files.map(file=>({file,sha256:sha256(fs.readFileSync(file))}));
}
async function ownerSnapshot(inventory) {
  nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'54329');assert.equal(url.pathname,'/recon_local');
  const db=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:3000,options:'-c default_transaction_read_only=on -c statement_timeout=10000'});
  try {
    await db.connect();await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await db.query("SELECT current_database() AS database,current_setting('server_version') AS version,current_setting('data_directory') AS directory,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.equal(identity.database,'recon_local');assert.match(identity.version,/^18\./);assert.equal(identity.readonly,'on');
    assert.equal(fs.realpathSync(identity.directory).toLowerCase(),fs.realpathSync('.local/postgres').toLowerCase());
    const result={fingerprint:await fingerprint(db),settings:(await db.query('SELECT * FROM "SiteSetting" ORDER BY key')).rows,media:(await db.query('SELECT * FROM "Media" ORDER BY id')).rows};
    assert.equal(result.fingerprint.data.length,18);
    for(const record of inventory.records) {
      const setting=result.settings.find(r=>r.key===record.key),media=result.media.filter(r=>r.fileUrl===record.sourceUrl);
      assert.equal(setting?.id,record.settingId);assert.equal(setting?.value,record.sourceUrl);assert.equal(setting?.type,'IMAGE_URL');
      assert.equal(media.length,1);assert.equal(media[0].id,record.mediaId);assert.equal(media[0].fileName,record.originalFileName);
      assert.equal(media[0].fileType,record.originalContentType);assert.equal(media[0].size,record.originalUploadBytes);
    }
    await db.query('ROLLBACK');return result;
  }finally{await db.end().catch(()=>{});}
}
async function sourcesFrom(inventory) {
  assert.equal(inventory.status,'VERIFIED_PREPARATION_ONLY');assert.equal(inventory.records.length,3);
  assert.deepEqual(inventory.records.map(r=>r.key).sort(),['favicon','footerLogo','websiteLogo']);
  assert.equal(new Set(inventory.records.map(r=>r.mediaId)).size,3);
  const sources=[];
  for(const record of inventory.records) {
    const file=fs.realpathSync(path.resolve('public',record.sourceUrl.slice(1)));
    assert.equal(file.toLowerCase(),fs.realpathSync(record.localFile).toLowerCase());
    const relative=path.relative(fs.realpathSync('public/uploads'),file);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
    const bytes=fs.readFileSync(file),metadata=await inspectImage(bytes);
    assert.equal(sha256(bytes),record.sha256);assert.equal(bytes.length,record.storedBytes);
    assert.equal(metadata.format,'png');assert.equal(metadata.width,record.width);assert.equal(metadata.height,record.height);assert.equal(metadata.hasAlpha,record.hasAlpha);
    const plan=planAsset(record);assert.deepEqual(plan,record.uploadPlan);sources.push({plan,bytes,sourceEvidence:metadata});
  }
  for(const backup of inventory.backups)assert.equal(sha256(fs.readFileSync(backup.file)),backup.sha256);
  return sources;
}

async function main() {
  if(process.argv[2]==='--prepare') {
    const run=privateRun('media-upload','launch05f');
    const inventory=JSON.parse(fs.readFileSync(inventoryFile));await sourcesFrom(inventory);
    const before=await ownerSnapshot(inventory);writeReport(run,'owner-before.json',before);
    writeReport(run,'files-before.json',fileState(inventory));
    // Only the non-secret cloud name can come from configuration. Upload keys
    // and secrets MUST be supplied again by the private interactive prompt.
    writeReport(run,'prepared.json',{inventoryFile,inventorySha256:sha256(fs.readFileSync(inventoryFile)),expectedCloudName:process.env.CLOUDINARY_CLOUD_NAME||null,sourceVerified:true});
    console.log(run);return;
  }
  const run=fs.realpathSync(process.argv[2]);
  assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch05f').toLowerCase());
  execFileSync('git',['check-ignore','--quiet',run],{stdio:'pipe',windowsHide:true});
  const prepared=JSON.parse(fs.readFileSync(path.join(run,'prepared.json')));
  const inventory=JSON.parse(fs.readFileSync(prepared.inventoryFile));
  assert.ok(!['account-verification.json','failure.json','completion.json','production-media-mapping.json'].some(name=>fs.existsSync(path.join(run,name))));
  let stage='private credential input',sequence=0,success=false,input;
  const journal=event=>writeReport(run,`journal-${String(++sequence).padStart(3,'0')}.json`,{time:new Date().toISOString(),...event});
  try {
    let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>8192)throw Error('Input limit');}
    input=JSON.parse(raw);raw='';
    validateUploadCredentials(input,prepared.expectedCloudName);
    stage='approved source and relationship recheck';
    assert.equal(sha256(fs.readFileSync(inventoryFile)),prepared.inventorySha256);
    const sources=await sourcesFrom(inventory);
    const before=JSON.parse(fs.readFileSync(path.join(run,'owner-before.json')));
    assert.equal(JSON.stringify(await ownerSnapshot(inventory)),JSON.stringify(before));
    assert.deepEqual(fileState(inventory),JSON.parse(fs.readFileSync(path.join(run,'files-before.json'))));
    stage='Cloudinary account authentication';
    const client=cloudinaryClient(input,sources.map(s=>s.plan));
    await client.ping();
    writeReport(run,'account-verification.json',{authenticated:true,cloudName:input.cloudName,accountSource:prepared.expectedCloudName?'CONFIGURATION_MATCH':'OWNER_CONFIRMED_PRIVATE_PROMPT',rotatedCredentialsConfirmed:true});
    console.log('ACCOUNT_AUTHENTICATED');
    input.apiSecret='';input.apiKey='';
    stage='approved asset lookup, upload and delivery verification';
    const results=await uploadApprovedAssets(client,sources,event=>{journal(event);console.log(`${event.key}: ${event.state}`);});
    stage='ID-preserving mapping';
    const mapped=mapActiveMedia(before.settings,before.media,results.map(r=>r.mapping),client.cloudName);
    const records=results.map(result=>{const original=inventory.records.find(r=>r.key===result.key);return {
      settingName:result.key,settingId:original.settingId,mediaId:original.mediaId,sourceUrl:original.sourceUrl,sourceSha256:original.sha256,
      publicId:result.asset.publicId,assetId:result.asset.assetId,version:result.asset.version,masterUrl:result.asset.masterUrl,
      verifiedHttpsUrl:result.mapping.targetUrl,sourceEvidence:sources.find(source=>source.plan.key===result.key).sourceEvidence,master:result.master,delivery:result.delivery,action:result.action};});
    writeReport(run,'verified-assets.json',{status:'VERIFIED',records});
    stage='final preservation verification';
    assert.equal(JSON.stringify(await ownerSnapshot(inventory)),JSON.stringify(before));
    assert.deepEqual(fileState(inventory),JSON.parse(fs.readFileSync(path.join(run,'files-before.json'))));
    const mapping={status:'VERIFIED_NOT_APPLIED',createdAt:new Date().toISOString(),cloudName:client.cloudName,planVersion:'recon-branding-v1',
      inventorySha256:prepared.inventorySha256,records,mappings:results.map(r=>r.mapping),mapped,
      relationshipsPreserved:true,historicalMediaExcluded:inventory.unreferencedMediaExcluded,ownerDatabaseFilesAndBackupsUnchanged:true,
      productionDatabaseWrites:0,localDatabaseWrites:0,browserVerification:'NOT_PERFORMED'};
    writeReport(run,'production-media-mapping.json',mapping);
    writeReport(run,'mapping-checksum.json',{file:'production-media-mapping.json',sha256:sha256(fs.readFileSync(path.join(run,'production-media-mapping.json')))});
    writeReport(run,'completion.json',{status:'VERIFIED',assetCount:3,actions:records.map(r=>({key:r.settingName,action:r.action})),relationshipsPreserved:true,ownerPreserved:true,mappingFile:path.join(run,'production-media-mapping.json')});
    success=true;console.log('UPLOAD_AND_MAPPING_VERIFIED');
  }catch(error) {
    const code=/^[A-Z][A-Z0-9_]{2,80}$/.test(error.code??'')?error.code:'CHECK_FAILED';
    const operation=/^[A-Z][A-Z0-9_]{2,80}$/.test(error.operation??'')?error.operation:null;
    writeReport(run,'failure.json',{status:'FAILED',stage,code,operation,automaticDeletion:false,automaticCredentialRetry:false});
    console.log(`STOPPED_SAFELY: ${code}; private report: ${path.join(run,'failure.json')}`);process.exitCode=1;
  }finally {
    if(input&&typeof input==='object'){input.apiKey='';input.apiSecret='';input.cloudName='';input.confirmCloudName='';}
    // Independent preservation proof is attempted on BOTH success and failure.
    try {
      const before=JSON.parse(fs.readFileSync(path.join(run,'owner-before.json')));
      assert.equal(JSON.stringify(await ownerSnapshot(inventory)),JSON.stringify(before));
      assert.deepEqual(fileState(inventory),JSON.parse(fs.readFileSync(path.join(run,'files-before.json'))));
      writeReport(run,'preservation.json',{ownerDatabaseFilesAndBackupsUnchanged:true,success});
    }catch{writeReport(run,'preservation.json',{ownerDatabaseFilesAndBackupsUnchanged:'NOT_VERIFIED',success});process.exitCode=1;}
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('LAUNCH-05F stopped safely; sensitive diagnostics suppressed.');process.exitCode=1;});
