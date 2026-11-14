import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {setTimeout as delay} from 'node:timers/promises';import {fileURLToPath} from 'node:url';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
const execute=promisify(execFile),hostname='www.reconimports.com',origin='https://'+hostname,worker='recon-imports-website',stageDir=path.resolve('.local/workers-build/source');
export function canonicalMatches(value,route){try{return new URL(value).href===new URL(route,origin).href;}catch{return false;}}
export function safeDomainBody(changeset,zoneId){
  assert.equal(changeset.conflicting.length,0,'Existing DNS conflict; no replacement authorized');assert.equal(changeset.removed.length,0,'Unrelated domain removal forbidden');assert.ok(changeset.updated.every(d=>!d.modified),'Existing domain modification requires review');assert.ok(changeset.added.every(d=>d.hostname===hostname));
  return {override_scope:true,override_existing_origin:false,override_existing_dns_record:false,origins:[{hostname,zone_id:zoneId}]};
}
async function main(){
  const run=privateRun('www-production','launch06');let stage='local preconditions',token='',deployed=false,domainAttached=false;
  const uploadConfig=path.join(stageDir,'.www-upload-config.json'),secretFile=path.join(run,'.auth-url-upload.tmp.json');let configCreated=false,secretCreated=false;
  try{
    const text=fs.readFileSync(path.join(stageDir,'wrangler.jsonc'),'utf8'),config=JSON.parse(text.replace(/^\s*\/\/.*$/gm,''));assert.deepEqual(config.routes,[{pattern:hostname,custom_domain:true}]);assert.equal(config.name,worker);assert.equal(config.hyperdrive[0].id,'02364ff5b23e47a8889958733e06d1da');assert.equal(config.r2_buckets[0].bucket_name,'recon-imports-next-cache');
    writeReport(run,'owner-authorization.json',{task:'WWW-PRODUCTION',source:'Explicit owner response: Authorize this exact www production setup',checkedAt:new Date().toISOString(),hostname,onlyChangedSecret:'AUTH_URL',databaseWrites:false,push:false,unrelatedDnsChanges:false,configSha256:sha256(text)});
    const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^AUTH_|^NEXTAUTH_|^CLOUDINARY_|^DATABASE_URL$|^ADMIN_|^PG/.test(k)));Object.assign(env,{OPEN_NEXT_DEPLOY:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'});
    stage='Cloudflare authentication';const identityOutput=await execute(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'whoami','--json'],{env,windowsHide:true});const identity=JSON.parse(identityOutput.stdout.slice(identityOutput.stdout.indexOf('{')));assert.equal(identity.accounts.length,1);const account=identity.accounts[0].id;
    token=fs.readFileSync(path.join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml'),'utf8').match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];assert.ok(token);
    async function api(route,method='GET',body){const response=await fetch('https://api.cloudflare.com/client/v4'+route,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(45000)});const data=await response.json();if(!response.ok||!data.success)throw Object.assign(Error('Cloudflare request stopped'),{code:'CF_HTTP_'+response.status,apiCodes:data.errors?.map(e=>e.code).filter(Number.isInteger)??[]});return data.result;}
    const workerPath=`/accounts/${account}/workers/scripts/${worker}`;
    stage='snapshot deployed bindings and domain conflict check';const before=await api(workerPath+'/settings');const domains=await api(`/accounts/${account}/workers/domains`);const owned=domains.filter(d=>d.service===worker);assert.ok(owned.every(d=>d.hostname===hostname),'Unrelated Worker domains must be preserved; stop for review');
    const zones=await api('/zones?name=reconimports.com');assert.equal(zones.length,1);assert.equal(zones[0].status,'active');const zone=zones[0].id;
    const changeset=await api(workerPath+'/domains/changeset?replace_state=true','POST',[{hostname,zone_id:zone}]);
    const body=safeDomainBody(changeset,zone);writeReport(run,'domain-precheck.json',{conflicts:0,removedDomains:0,forcedDnsReplacement:false});
    if(!owned.some(d=>d.hostname===hostname)){stage='authorized conflict-safe www domain attachment';await api(workerPath+'/domains/records','PUT',body);}domainAttached=true;writeReport(run,'domain-attached.json',{hostname,overrideExistingDns:false,overrideExistingOrigin:false});
    // Wrangler noninteractive custom-domain publication forces overrides. Omit
    // routes only in this generated upload config; the safe API above owns DNS.
    const upload={...config};delete upload.routes;fs.writeFileSync(uploadConfig,JSON.stringify(upload),{flag:'wx'});configCreated=true;
    fs.writeFileSync(secretFile,JSON.stringify({AUTH_URL:origin}),{flag:'wx',mode:0o600});secretCreated=true;
    stage='authorized canonical/application and AUTH_URL deployment';
    try{await execute(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'deploy','--config',uploadConfig,'--secrets-file',secretFile,'--no-autoconfig'],{cwd:stageDir,env,windowsHide:true,maxBuffer:16*1024*1024,timeout:600000});}catch(error){throw Object.assign(Error('Deployment failed; raw output suppressed'),{code:'WRANGLER_DEPLOY_FAILED',apiCodes:[...String(error.stderr??'').matchAll(/\[code: (\d+)\]/g)].map(m=>Number(m[1]))});}
    deployed=true;writeReport(run,'upload-completed.json',{deployed:true,origin,onlyChangedSecret:'AUTH_URL',databaseWrites:0,pushed:false});
    stage='verify retained bindings';const after=await api(workerPath+'/settings');const filtered=s=>s.bindings.map(b=>({...b})).sort((a,b)=>a.name.localeCompare(b.name));assert.deepEqual(filtered(after),filtered(before));
    const afterDomains=await api(`/accounts/${account}/workers/domains`);assert.ok(afterDomains.some(d=>d.hostname===hostname&&d.service===worker));
    stage='wait for public DNS/HTTPS readiness';let ready=false;
    for(let i=0;i<18;i++){try{const response=await fetch(origin,{signal:AbortSignal.timeout(12000)});if(response.status===200){await response.body?.cancel();ready=true;break;}await response.body?.cancel();}catch{}await delay(10000);}assert.equal(ready,true,'HTTPS not ready; no automatic redeploy');
    stage='verify canonical URLs and production login origin';const checks=[];
    for(const route of ['/','/about-us']){const r=await fetch(origin+route,{signal:AbortSignal.timeout(30000)}),html=await r.text();const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];writeReport(run,'canonical-'+(route==='/'?'home':'about')+'.json',{route,status:r.status,canonical});assert.equal(r.status,200);assert.equal(canonicalMatches(canonical,route),true);checks.push({route,status:r.status,canonical});}
    const robots=await fetch(origin+'/robots.txt'),robotsText=await robots.text();assert.equal(robots.status,200);assert.ok(robotsText.includes(origin+'/sitemap.xml'));
    const sitemap=await fetch(origin+'/sitemap.xml'),xml=await sitemap.text();assert.equal(sitemap.status,200);assert.ok(xml.includes('<loc>'+origin+'/'));assert.ok(!xml.includes('<loc>https://reconimports.com/'));
    const providers=await fetch(origin+'/api/auth/providers'),p=await providers.json();assert.equal(new URL(p.credentials.signinUrl).origin,origin);assert.equal(new URL(p.credentials.callbackUrl).origin,origin);
    const admin=await fetch(origin+'/admin',{redirect:'manual'});assert.ok([302,303,307,308].includes(admin.status));assert.equal(new URL(admin.headers.get('location'),origin).pathname,'/admin/login');assert.match(admin.headers.get('cache-control')??'',/no-store/);
    writeReport(run,'completion.json',{status:'WWW_PRODUCTION_VERIFIED',origin,checks,robotsAndSitemapWww:true,authUrlWww:true,anonymousAdminDenied:true,bindingsAndSecretNamesPreserved:true,onlyChangedSecret:'AUTH_URL',forcedDnsReplacement:false,otherDnsOperations:0,databaseWrites:0,pushed:false,realAdminLogin:'NOT_TESTED'});console.log(JSON.stringify({status:'WWW_PRODUCTION_VERIFIED',origin,privateReceipt:run}));
  }catch(error){writeReport(run,'failure.json',{status:'STOPPED_SAFELY',stage,domainAttached,deployed,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',apiCodes:error.apiCodes??[],automaticRetry:false});console.log(JSON.stringify({status:'STOPPED_SAFELY',stage,privateReceipt:run}));process.exitCode=1;}
  finally{token='';if(secretCreated)fs.unlinkSync(secretFile);if(configCreated)fs.unlinkSync(uploadConfig);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('www setup stopped; private details suppressed.');process.exitCode=1;});
