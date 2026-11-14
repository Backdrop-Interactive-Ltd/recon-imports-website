import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {sha256,writeReport} from './launch05a-common.mjs';import {validateWorkerSecrets,initialWorkerUrl} from './workers-secret-prepare.mjs';
const execute=promisify(execFile),staging=path.resolve('.local/workers-build/source');
export function containsBrandingAsset(html,publicId){return html.replace(/%2f/gi,'/').replace(/\\\//g,'/').includes(publicId);}
function privateDirectory(value){const dir=fs.realpathSync(value);assert.equal(path.dirname(dir).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assert.match(path.basename(dir),/-workers-secret-preparation-/);return dir;}
export function requireDeploymentAuthorization(plan,digest,authorization){
  assert.equal(authorization.task,'WORKERS-INITIAL');assert.equal(authorization.planSha256,digest);
  for(const key of ['createWorker','deployWorker','attachSecrets','initializeConfiguredBindings','publishWorkersDev'])assert.equal(authorization[key],true);
  for(const key of ['push','changeDns','databaseWrites'])assert.equal(authorization[key],false);
  assert.equal(plan.worker,'recon-imports-website');assert.equal(plan.initialUrl,initialWorkerUrl);assert.equal(plan.hyperdriveId,'02364ff5b23e47a8889958733e06d1da');assert.equal(plan.r2Bucket,'recon-imports-next-cache');
}
function checkPlan(run){
  const bytes=fs.readFileSync(path.join(run,'deployment-plan.json')),plan=JSON.parse(bytes);
  requireDeploymentAuthorization(plan,sha256(bytes),JSON.parse(fs.readFileSync(path.join(run,'owner-deployment-authorization.json'))));
  assert.equal(sha256(fs.readFileSync(path.join(run,'production-secrets.dpapi'))),plan.encryptedBundleSha256);
  assert.equal(sha256(fs.readFileSync(path.join(staging,'wrangler.jsonc'))),plan.wranglerSha256);
  assert.equal(sha256(fs.readFileSync(path.join(staging,'.open-next/worker.js'))),plan.workerEntrySha256);
  assert.ok(!fs.existsSync(path.join(run,'deployment-started.json')),'A deployment was already attempted; no automatic retry');return plan;
}
async function main(){
  const mode=process.argv[2],run=privateDirectory(process.argv[3]);
  if(mode==='--plan'){
    const prepared=JSON.parse(fs.readFileSync(path.join(run,'completion.json'),'utf8').replace(/^\uFEFF/,''));assert.equal(prepared.status,'ENCRYPTED_WORKER_SECRETS_PREPARED');
    assert.equal(sha256(fs.readFileSync('wrangler.jsonc')),sha256(fs.readFileSync(path.join(staging,'wrangler.jsonc'))));
    const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));assert.ok(!config.routes?.length);assert.ok(!config.route);assert.equal(config.name,'recon-imports-website');
    writeReport(run,'deployment-plan.json',{task:'WORKERS-INITIAL',worker:config.name,initialUrl:initialWorkerUrl,hyperdriveId:config.hyperdrive[0].id,r2Bucket:config.r2_buckets[0].bucket_name,secretNames:['AUTH_SECRET','AUTH_URL','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'],encryptedBundleSha256:sha256(fs.readFileSync(path.join(run,'production-secrets.dpapi'))),wranglerSha256:sha256(fs.readFileSync(path.join(staging,'wrangler.jsonc'))),workerEntrySha256:sha256(fs.readFileSync(path.join(staging,'.open-next/worker.js'))),bindings:['ASSETS','WORKER_SELF_REFERENCE','HYPERDRIVE','NEXT_INC_CACHE_R2_BUCKET','NEXT_CACHE_DO_QUEUE','NEXT_TAG_CACHE_DO_SHARDED','IMAGES'],durableObjectMigrationTag:'v1',populateBuildFallbackCache:false,databaseWrites:false,push:false,changeDns:false});console.log('DEPLOYMENT_PLAN_PREPARED');return;
  }
  if(mode==='--check'){checkPlan(run);console.log('EXPLICIT_DEPLOYMENT_AUTHORIZATION_VERIFIED');return;}
  assert.equal(mode,'--deploy');let stage='explicit-authorization',attempted=false;
  try{
    const plan=checkPlan(run),secretFile=path.resolve(process.argv[4]);assert.equal(secretFile,path.join(run,'.secrets-upload.tmp.json'));
    let secrets=JSON.parse(fs.readFileSync(secretFile)),mapping=JSON.parse(fs.readFileSync('.local/launch05f/20261114031132771-media-upload-45db51a9/production-media-mapping.json'));
    validateWorkerSecrets(secrets,secrets.CLOUDINARY_CLOUD_NAME,mapping.cloudName);for(const key of Object.keys(secrets))secrets[key]='';secrets=null;
    const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^AUTH_|^NEXTAUTH_|^CLOUDINARY_|^DATABASE_URL$|^ADMIN_|^PG/.test(key)));
    Object.assign(env,{WRANGLER_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',OPEN_NEXT_DEPLOY:'true'});
    writeReport(run,'deployment-started.json',{planSha256:sha256(fs.readFileSync(path.join(run,'deployment-plan.json'))),checkedAt:new Date().toISOString()});
    stage='authorized initial Worker deployment';attempted=true;
    try{await execute(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'deploy','--config',path.join(staging,'wrangler.jsonc'),'--secrets-file',secretFile,'--no-autoconfig'],{cwd:staging,env,windowsHide:true,maxBuffer:16*1024*1024,timeout:600000});}
    catch(error){const codes=[...String(error.stderr??'').matchAll(/\[code: (\d+)\]/g)].map(m=>Number(m[1]));throw Object.assign(Error('Deployment stopped; raw output suppressed'),{code:'WRANGLER_DEPLOY_FAILED',apiCodes:codes});}
    writeReport(run,'worker-upload-completed.json',{deployed:true,initialUrl:plan.initialUrl,secretNames:plan.secretNames,bindings:plan.bindings,databaseWrites:0,pushed:false,dnsChanged:false});
    stage='public HTTPS checks';const results=[];
    for(const route of ['/','/about-us','/admin/login','/api/auth/session']){const response=await fetch(plan.initialUrl+route,{redirect:'manual',signal:AbortSignal.timeout(45000)});const body=await response.text();results.push({route,status:response.status,noStore:/no-store/.test(response.headers.get('cache-control')??''),...(route==='/'?{productionCloudinaryBrandingPresent:body.includes('res.cloudinary.com/'+mapping.cloudName)}:{})});writeReport(run,'https-check-'+results.length+'.json',results.at(-1));assert.equal(response.status,200);}
    assert.equal(results.find(result=>result.route==='/').productionCloudinaryBrandingPresent,true,'Production branding verification failed');assert.equal(results.find(result=>result.route==='/api/auth/session').noStore,true,'Session response must not be cached');
    const response=await fetch(plan.initialUrl+'/admin',{redirect:'manual',signal:AbortSignal.timeout(45000)});assert.ok([302,303,307,308].includes(response.status));results.push({route:'/admin',anonymousAccessDenied:true,status:response.status});
    writeReport(run,'verification.json',{status:'WORKER_DEPLOYED_HTTPS_VERIFIED',initialUrl:plan.initialUrl,checks:results,realAdminLogin:'NOT_TESTED',cloudinaryUploads:'NOT_TESTED',databaseWrites:0,pushed:false,dnsChanged:false});console.log('WORKER_DEPLOYED_HTTPS_VERIFIED');
  }catch(error){writeReport(run,'deployment-failure.json',{status:'STOPPED_SAFELY',stage,deploymentAttempted:attempted,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',apiCodes:error.apiCodes??[],automaticRetry:false});console.log('STOPPED_SAFELY; inspect sanitized private deployment receipt.');process.exitCode=1;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Deployment preparation stopped; sensitive details suppressed.');process.exitCode=1;});
