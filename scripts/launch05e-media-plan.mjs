import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import nextEnv from '@next/env';
import pg from 'pg';
import sharp from 'sharp';
import {privateRun,sha256,writeReport,fingerprint} from './launch05a-common.mjs';

const keys=['websiteLogo','footerLogo','favicon'];
const version='recon-branding-v1';

// Pure plan, deliberately without a Cloudinary client or executable upload path.
export function planAsset(source) {
  assert.ok(keys.includes(source.key));
  assert.ok(typeof source.mediaId==='string'&&source.mediaId.length>0);
  assert.match(source.sourceUrl,/^\/uploads\/[a-zA-Z0-9/_.-]+$/);
  assert.match(source.sha256,/^[a-f0-9]{64}$/);
  assert.equal(source.format,'png');
  for(const value of [source.width,source.height,source.storedBytes])assert.ok(Number.isSafeInteger(value)&&value>0);
  const publicId=`recon-imports/branding/migration-v1/${sha256(source.mediaId+'\n'+source.sha256)}`;
  return {planVersion:version,mediaId:source.mediaId,key:source.key,sourceUrl:source.sourceUrl,sha256:source.sha256,
    storedBytes:source.storedBytes,format:source.format,width:source.width,height:source.height,publicId,
    resourceType:'image',deliveryType:'upload',parameters:{public_id:publicId,overwrite:'false',unique_filename:'false',use_filename:'false',
      context:`recon_source_sha256=${source.sha256}|recon_plan=${version}`}};
}

// Inputs must come from a separately authorized Admin API lookup and original
// versioned-master download. This function performs no network or write action.
export function assessAsset(plan,cloudName,resource,download) {
  assert.match(cloudName,/^[a-z0-9_-]+$/i);
  const conflicts=[];
  if(resource.public_id!==plan.publicId||resource.resource_type!=='image'||resource.type!=='upload')conflicts.push('ASSET_IDENTITY_MISMATCH');
  if(typeof resource.asset_id!=='string'||!resource.asset_id||!Number.isSafeInteger(resource.version)||resource.version<1)conflicts.push('MISSING_STABLE_ASSET_METADATA');
  if(resource.overwritten===true)conflicts.push('UNEXPECTED_OVERWRITE');
  if(resource.context?.custom?.recon_source_sha256!==plan.sha256||resource.context?.custom?.recon_plan!==plan.planVersion)conflicts.push('SOURCE_CONTEXT_MISMATCH');
  if(resource.format!=='png'||resource.width!==plan.width||resource.height!==plan.height)conflicts.push('PROVIDER_FORMAT_OR_DIMENSIONS_MISMATCH');
  let target;
  try {
    target=new URL(resource.secure_url);
    if(target.protocol!=='https:'||target.hostname!=='res.cloudinary.com'||target.username||target.password||target.port||target.search||target.hash||
      target.pathname!==`/${cloudName}/image/upload/v${resource.version}/${plan.publicId}.png`)conflicts.push('UNAPPROVED_MASTER_URL');
  }catch{conflicts.push('UNAPPROVED_MASTER_URL');}
  if(download.httpStatus!==200||download.contentType?.split(';')[0].trim().toLowerCase()!=='image/png'||download.format!=='png'||download.width!==plan.width||download.height!==plan.height)conflicts.push('MASTER_DELIVERY_MISMATCH');
  if(resource.bytes!==download.bytes)conflicts.push('PROVIDER_BYTES_DISAGREE_WITH_MASTER');
  if(conflicts.length)return {status:'CONFLICT',reasons:conflicts};
  if(download.sha256!==plan.sha256||download.bytes!==plan.storedBytes)return {status:'NEEDS_REVIEW',reasons:['MASTER_BYTES_OR_CHECKSUM_DIFFER']};
  // Match the current settings loader so saving its normalized value later does
  // not break the string relationship between SiteSetting.value and Media.fileUrl.
  const transform=plan.key==='favicon'?'f_auto,q_auto':'f_auto,q_auto,w_260,c_limit';
  const delivery=new URL(target.href);delivery.pathname=delivery.pathname.replace('/image/upload/',`/image/upload/${transform}/`);
  return {status:'VERIFIED',reasons:[],mapping:{mediaId:plan.mediaId,sourceUrl:plan.sourceUrl,targetUrl:delivery.href},
    asset:{assetId:resource.asset_id,publicId:plan.publicId,version:resource.version,masterUrl:target.href,masterSha256:download.sha256}};
}

function fileState() {
  const rows=[];
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else rows.push({file,sha256:sha256(fs.readFileSync(file))});}}
  for(const file of fs.readdirSync('.').filter(name=>/^\.env(?:\.|$)/.test(name)).sort())rows.push({file,sha256:sha256(fs.readFileSync(file))});
  walk('public/uploads');walk('prisma/migrations');
  return rows;
}

async function main() {
  const run=privateRun('media-inventory','launch05e');let db,stage='source preflight';
  try {
    const filesBefore=fileState();nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
    const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'54329');assert.equal(url.pathname,'/recon_local');
    db=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:3000,options:'-c default_transaction_read_only=on -c statement_timeout=10000'});
    await db.connect();await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await db.query("SELECT current_database() AS database,current_setting('server_version') AS version,current_setting('data_directory') AS directory,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.equal(identity.database,'recon_local');assert.match(identity.version,/^18\./);assert.equal(identity.readonly,'on');assert.equal(fs.realpathSync(identity.directory).toLowerCase(),fs.realpathSync('.local/postgres').toLowerCase());
    const before=await fingerprint(db);assert.equal(before.data.length,18);
    const settings=(await db.query('SELECT id,key,value,type FROM "SiteSetting" WHERE key=ANY($1) ORDER BY key',[keys])).rows;
    const media=(await db.query('SELECT id,"fileUrl","fileName","fileType",size FROM "Media" ORDER BY id')).rows;
    assert.equal(settings.length,3);assert.equal(new Set(settings.map(r=>r.id)).size,3);
    stage='media file verification';const inventory=[];
    for(const setting of settings) {
      assert.equal(setting.type,'IMAGE_URL');assert.match(setting.value,/^\/uploads\/[a-zA-Z0-9/_.-]+$/);
      const matches=media.filter(row=>row.fileUrl===setting.value);assert.equal(matches.length,1);const row=matches[0];
      const absolute=fs.realpathSync(path.resolve('public',setting.value.slice(1)));const relative=path.relative(fs.realpathSync('public/uploads'),absolute);
      assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
      const data=fs.readFileSync(absolute),metadata=await sharp(data,{limitInputPixels:40000000}).metadata();
      assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(metadata.format,'png');assert.ok(!metadata.pages||metadata.pages===1);
      const source={key:setting.key,settingId:setting.id,mediaId:row.id,sourceUrl:row.fileUrl,localFile:absolute,originalFileName:row.fileName,
        originalContentType:row.fileType,originalUploadBytes:row.size,storedBytes:data.length,format:metadata.format,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,sha256:sha256(data)};
      inventory.push({...source,uploadPlan:planAsset(source)});
    }
    assert.equal(new Set(inventory.map(row=>row.mediaId)).size,3);assert.equal(new Set(inventory.map(row=>row.uploadPlan.publicId)).size,3);
    const references=(await db.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype='f' AND confrelid='public.\"Media\"'::regclass")).rows[0].count;
    await db.query('ROLLBACK');
    stage='existing backup verification';
    const backupBin=path.join(process.env.LOCALAPPDATA,'ReconImports/PostgreSQL-client-18.7/bin/pg_restore.exe');
    assert.match(execFileSync(backupBin,['--version'],{encoding:'utf8',windowsHide:true}),/18\.7/);
    const backups=[];
    for(const entry of fs.readdirSync('.local/launch05a',{withFileTypes:true}).filter(e=>e.isDirectory())) {
      const file=path.join('.local/launch05a',entry.name,'backup-verification.json');if(!fs.existsSync(file))continue;
      const report=JSON.parse(fs.readFileSync(file));assert.equal(report.status,'VERIFIED');const digest=sha256(fs.readFileSync(report.backup));assert.equal(digest,report.sha256);
      const list=execFileSync(backupBin,['--list',report.backup],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});assert.ok(list.includes('TABLE DATA'));
      backups.push({file:report.backup,bytes:fs.statSync(report.backup).size,sha256:digest,archiveReadable:true,originalRestoreVerification:report.allTableFingerprintsMatch});
    }
    assert.equal(backups.length,2);
    stage='preservation';await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');assert.deepEqual(await fingerprint(db),before);await db.query('ROLLBACK');assert.deepEqual(fileState(),filesBefore);
    writeReport(run,'media-inventory.json',{status:'VERIFIED_PREPARATION_ONLY',createdAt:new Date().toISOString(),records:inventory,activeCount:3,unreferencedMediaExcluded:media.length-3,
      relationship:'SiteSetting.value matches Media.fileUrl; IDs and other metadata remain unchanged',foreignKeysToMedia:references,
      cloudinaryConfigurationPresent:Object.fromEntries(['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].map(name=>[name,!!process.env[name]])),
      backups,ownerDatabaseAndFilesUnchanged:true,cloudinaryRequests:0,supabaseConnections:0,verifiedRemoteAssets:0});
    console.log(JSON.stringify({status:'VERIFIED_PREPARATION_ONLY',report:path.join(run,'media-inventory.json'),activeMedia:3,storedBytes:inventory.reduce((sum,row)=>sum+row.storedBytes,0),backupsVerified:backups.length,cloudinaryRequests:0,sourceUnchanged:true}));
  }catch(error){writeReport(run,'failure.json',{status:'FAILED',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED'});console.error(JSON.stringify({status:'FAILED',stage,privateRun:run}));process.exitCode=1;}
  finally{await db?.end().catch(()=>{});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Media preparation stopped safely; sensitive details suppressed.');process.exitCode=1;});
