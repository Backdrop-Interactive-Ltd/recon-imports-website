import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
import {validateProduction} from './launch05g-backup.mjs';
import {verifyReadOnlyRoleLogin} from './launch06-role-passwords.mjs';
export const hyperdriveId='02364ff5b23e47a8889958733e06d1da';
export function credentialPatch(before,password,targetFingerprint){
  assert.equal(before.id,hyperdriveId);assert.equal(before.name,'recon-imports-production-db');assert.equal(before.caching?.disabled,true);
  assert.equal(before.origin.port,5432);assert.equal(before.origin.database,'postgres');assert.ok(['postgres','postgresql'].includes(before.origin.scheme));
  const project=before.origin.user.split('.')[1];assert.match(project??'',/^[a-z0-9]{20}$/);assert.match(before.origin.user,/^(postgres|recon_runtime)\./);
  assert.equal(sha256([before.origin.host,project,'postgres.'+project,before.origin.database].join('|')),targetFingerprint);
  assert.ok(typeof password==='string'&&password.length>0&&!/[\r\n\0]/.test(password));
  return {origin:{user:'recon_runtime.'+project,password}};
}
export function preservedConfiguration(config){return {id:config.id,name:config.name,endpoint:{host:config.origin.host,port:config.origin.port,database:config.origin.database,scheme:config.origin.scheme},caching:config.caching,mtls:config.mtls,connectionLimit:config.origin_connection_limit};}
async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('hyperdrive-runtime-update','launch06'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch06').toLowerCase());assert.match(path.basename(run),/-hyperdrive-runtime-update-/);
  let raw='',input,token='',stage='private-input',patchAttempted=false;
  try{
    for await(const chunk of process.stdin){raw+=chunk;if(raw.length>8192)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    stage='Cloudflare authentication';
    const output=execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','whoami','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:30000,env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'}});
    const identity=JSON.parse(output.slice(output.indexOf('{')));assert.equal(identity.loggedIn,true);assert.equal(identity.accounts.length,1);
    const authFile=path.join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml');
    token=fs.readFileSync(authFile,'utf8').match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];assert.ok(token);
    const url=`https://api.cloudflare.com/client/v4/accounts/${identity.accounts[0].id}/hyperdrive/configs/${hyperdriveId}`;
    async function api(method,body){
      const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(45000)});
      const json=await response.json();if(!response.ok||!json.success)throw Object.assign(Error('Cloudflare operation stopped'),{code:'CF_HTTP_'+response.status,apiCodes:(json.errors??[]).map(e=>e.code).filter(Number.isInteger)});return json.result;
    }
    stage='pin existing Hyperdrive target';const before=await api('GET');
    const plan=JSON.parse(fs.readFileSync('.local/launch06/20261114090022544-recovery-access-2a354191/approval-plan.json'));
    const patch=credentialPatch(before,input.password,plan.targetFingerprint),project=patch.origin.user.split('.')[1];
    stage='read-only runtime login verification';
    const config=validateProduction({host:before.origin.host,project,confirmProject:project,user:patch.origin.user,password:input.password,database:before.origin.database,port:before.origin.port,caFile:'C:/Users/user/Downloads/prod-ca-2021.crt'});
    await verifyReadOnlyRoleLogin(config,'recon_runtime',input.password);
    writeReport(run,'precheck.json',{hyperdriveId,targetMatchesApprovedProduction:true,runtimeTlsLoginVerified:true,queryCacheDisabled:true,configurationSha256:sha256(JSON.stringify(preservedConfiguration(before)))});
    stage='authorized credential-only Hyperdrive PATCH';patchAttempted=true;await api('PATCH',patch);patch.origin.password='';
    stage='verify preserved remote configuration';const after=await api('GET');assert.equal(after.origin.user,patch.origin.user);assert.deepEqual(preservedConfiguration(after),preservedConfiguration(before));
    writeReport(run,'completion.json',{status:'HYPERDRIVE_RUNTIME_VERIFIED',hyperdriveId,runtimeRole:true,runtimeTlsLoginVerified:true,queryCacheDisabled:true,endpointAndTlsAndOtherConfigurationPreserved:true,databaseWrites:0,deployed:false,pushed:false,dnsChanged:false});
    console.log('HYPERDRIVE_RUNTIME_VERIFIED');
  }catch(error){writeReport(run,'failure.json',{status:'STOPPED_SAFELY',stage,patchAttempted,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',apiCodes:error.apiCodes??[],automaticRetry:false});console.log('STOPPED_SAFELY; inspect sanitized private receipt.');process.exitCode=1;}
  finally{raw='';token='';if(input)input.password='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Hyperdrive update stopped; private details suppressed.');process.exitCode=1;});
