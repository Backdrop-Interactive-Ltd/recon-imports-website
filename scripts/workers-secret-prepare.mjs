import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {privateRun,writeReport,sha256} from './launch05a-common.mjs';
import {verifyCloudinaryAuthentication} from './launch05f-auth.mjs';
export const initialWorkerUrl='https://recon-imports-website.backdropinteractiveltd.workers.dev';
export function validateWorkerSecrets(secrets,confirmCloudName,expectedCloud){
  assert.deepEqual(Object.keys(secrets).sort(),['AUTH_SECRET','AUTH_URL','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].sort());
  assert.match(secrets.AUTH_SECRET,/^[A-Za-z0-9+/]{64}$/);assert.equal(secrets.AUTH_URL,initialWorkerUrl);
  assert.equal(secrets.CLOUDINARY_CLOUD_NAME,expectedCloud);assert.equal(confirmCloudName,expectedCloud);
  assert.match(secrets.CLOUDINARY_API_KEY,/^\d{5,40}$/);assert.ok(secrets.CLOUDINARY_API_SECRET.length>=10&&!/[\r\n]/.test(secrets.CLOUDINARY_API_SECRET));
}
async function main(){
  if(process.argv[2]==='--prepare'){console.log(privateRun('workers-secret-preparation','launch06'));return;}
  const run=fs.realpathSync(process.argv[2]);assert.equal(path.dirname(run).toLowerCase(),path.resolve('.local/launch06').toLowerCase());
  let raw='',input,stage='private-input';
  try{
    for await(const chunk of process.stdin){raw+=chunk;if(raw.length>16384)throw Error('Input limit');}input=JSON.parse(raw);raw='';
    const mappingFile='.local/launch05f/20261114031132771-media-upload-45db51a9/production-media-mapping.json',mappingBytes=fs.readFileSync(mappingFile);
    assert.equal(sha256(mappingBytes),'0d1f66ad05a3ffc322c93f6f6d007b1e7d43fbb634eb6f26bc509cdaa9b79c90');
    stage='validate expected Cloudinary environment and secret names';validateWorkerSecrets(input.secrets,input.confirmCloudName,JSON.parse(mappingBytes).cloudName);
    stage='Cloudinary GET ping only';const result=await verifyCloudinaryAuthentication({cloudName:input.secrets.CLOUDINARY_CLOUD_NAME,confirmCloudName:input.confirmCloudName,apiKey:input.secrets.CLOUDINARY_API_KEY,apiSecret:input.secrets.CLOUDINARY_API_SECRET,newlyRotated:true});
    if(result.status!=='AUTH_VERIFIED')throw Object.assign(Error('Cloudinary authentication stopped'),{code:result.code});
    writeReport(run,'secrets-validation.json',{status:'PRODUCTION_SECRET_INPUT_VERIFIED',secretNames:Object.keys(input.secrets).sort(),initialWorkerUrl,cloudinaryProductEnvironmentMatchesVerifiedMedia:true,cloudinaryPingVerified:true,remoteWrites:0,deployed:false});console.log('PRODUCTION_SECRET_INPUT_VERIFIED');
  }catch(error){writeReport(run,'failure.json',{status:'STOPPED_SAFELY',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',automaticRetry:false});console.log('STOPPED_SAFELY; inspect sanitized private receipt.');process.exitCode=1;}
  finally{raw='';if(input?.secrets)for(const key of Object.keys(input.secrets))input.secrets[key]='';if(input)input.confirmCloudName='';}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Secret preparation stopped; private details suppressed.');process.exitCode=1;});
