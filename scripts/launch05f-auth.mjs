import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {privateRun,writeReport} from './launch05a-common.mjs';

// Standalone authentication check. No uploader, SDK, database, application
// configuration, asset lookup or other Cloudinary operation is imported.
export async function verifyCloudinaryAuthentication(input,{fetchImpl=fetch}={}) {
  const result={task:'LAUNCH-05F-AUTH',status:'AUTH_FAILED',operation:'CLOUDINARY_ADMIN_PING',
    method:'GET',endpoint:'https://api.cloudinary.com/v1_1/<cloud-name>/ping',
    requestAttempts:0,httpStatus:null,assetRequests:0,databaseConnections:0,automaticRetries:0,
    credentialPairVerified:false,cloudNameConfirmed:false};
  let authorization;
  const reject=code=>({...result,status:'INPUT_REJECTED',code});
  try {
    if(!input||typeof input!=='object')return reject('INPUT_INVALID');
    if(typeof input.cloudName!=='string'||!/^[a-z0-9_-]{1,128}$/i.test(input.cloudName))return reject('CLOUD_NAME_INVALID');
    if(input.cloudName!==input.confirmCloudName)return reject('CLOUD_NAME_CONFIRMATION_MISMATCH');
    result.cloudNameConfirmed=true;
    if(input.newlyRotated!==true)return reject('ROTATED_CREDENTIALS_REQUIRED');
    if(typeof input.apiKey!=='string'||!/^\d{5,40}$/.test(input.apiKey))return reject('API_KEY_FORMAT_INVALID');
    if(typeof input.apiSecret!=='string'||input.apiSecret.length<10||input.apiSecret.length>256||/[\r\n]/.test(input.apiSecret)||input.apiSecret!==input.apiSecret.trim())return reject('API_SECRET_FORMAT_INVALID');
    if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')return reject('TLS_VERIFICATION_REQUIRED');
    const encoded=Buffer.from(input.apiKey+':'+input.apiSecret,'utf8');
    try {authorization='Basic '+encoded.toString('base64');}finally{encoded.fill(0);}
    const endpoint=`https://api.cloudinary.com/v1_1/${input.cloudName}/ping`;
    // Credentials are single-use input, never a return value or report field.
    input.apiKey='';input.apiSecret='';
    result.requestAttempts=1;
    let response;
    try {
      response=await fetchImpl(endpoint,{method:'GET',headers:{Authorization:authorization,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(30000)});
    }catch{return {...result,code:'AUTH_REQUEST_FAILED'};}
    result.httpStatus=response.status;
    if(response.status!==200) {
      // Error bodies/headers may contain credential values. Do not read them.
      await response.body?.cancel().catch(()=>{});
      return {...result,code:response.status===401?'API_HTTP_401':`API_HTTP_${response.status}`,
        diagnostic:response.status===401?'CREDENTIALS_OR_AUTHORIZATION_REJECTED':'PING_NOT_SUCCESSFUL'};
    }
    if(Number(response.headers.get('content-length'))>16384){await response.body?.cancel().catch(()=>{});return {...result,code:'PING_RESPONSE_TOO_LARGE'};}
    const reader=response.body?.getReader();if(!reader)return {...result,code:'PING_RESPONSE_INVALID'};
    const parts=[];let size=0;
    try {
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384)return {...result,code:'PING_RESPONSE_TOO_LARGE'};parts.push(Buffer.from(value));}
      const payload=JSON.parse(Buffer.concat(parts).toString('utf8'));
      if(payload?.status!=='ok')return {...result,code:'PING_RESPONSE_INVALID'};
    }catch{return {...result,code:'PING_RESPONSE_INVALID'};}
    finally {for(const part of parts)part.fill(0);await reader.cancel().catch(()=>{});reader.releaseLock();}
    return {...result,status:'AUTH_VERIFIED',code:'AUTH_VERIFIED',credentialPairVerified:true};
  }finally {
    authorization=undefined;
    if(input&&typeof input==='object'){input.apiKey='';input.apiSecret='';input.cloudName='';input.confirmCloudName='';}
  }
}

async function main() {
  if(process.argv[2]==='--prepare') {
    console.log(privateRun('authentication','launch05f'));return;
  }
  const run=fs.realpathSync(process.argv[2]);
  if(path.dirname(run).toLowerCase()!==path.resolve('.local/launch05f').toLowerCase()||!/^\d+-authentication-[a-f0-9]+$/.test(path.basename(run)))throw Error('Invalid private directory');
  execFileSync('git',['check-ignore','--quiet',run],{stdio:'pipe',windowsHide:true});
  const report=path.join(run,'authentication.json');
  if(fs.existsSync(report))throw Error('A new prompt is required for each attempt');
  let input,raw='';
  try {
    for await(const chunk of process.stdin){raw+=chunk;if(raw.length>4096)throw Error('Input limit');}
    input=JSON.parse(raw);raw='';
    const result=await verifyCloudinaryAuthentication(input);
    writeReport(run,'authentication.json',{...result,checkedAt:new Date().toISOString()});
    console.log(JSON.stringify({status:result.status,code:result.code,httpStatus:result.httpStatus,operation:result.operation,report}));
    if(result.status!=='AUTH_VERIFIED')process.exitCode=1;
  }catch {
    if(!fs.existsSync(report))writeReport(run,'authentication.json',{task:'LAUNCH-05F-AUTH',status:'INPUT_REJECTED',code:'INPUT_OR_LOCAL_CHECK_FAILED',assetRequests:0,databaseConnections:0});
    console.log('AUTHENTICATION_STOPPED_SAFELY');process.exitCode=1;
  }finally {
    raw='';if(input&&typeof input==='object')for(const key of ['apiKey','apiSecret','cloudName','confirmCloudName'])input[key]='';
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Authentication-only check stopped safely; sensitive details suppressed.');process.exitCode=1;});
