import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {planAsset,assessAsset} from './launch05e-media-plan.mjs';
import {sha256} from './launch05a-common.mjs';

export function stop(code,operation) { const error=new Error(code);error.code=code;if(operation)error.operation=operation;throw error; }
export function validateUploadCredentials(input,expectedCloudName=null) {
  if(input?.newlyRotated!==true)stop('ROTATED_CREDENTIALS_REQUIRED','INPUT_VALIDATION');
  if(typeof input.cloudName!=='string'||!/^[a-z0-9_-]{1,128}$/i.test(input.cloudName))stop('CLOUD_NAME_INVALID','INPUT_VALIDATION');
  if(input.cloudName!==input.confirmCloudName)stop('CLOUD_NAME_CONFIRMATION_MISMATCH','INPUT_VALIDATION');
  if(expectedCloudName&&input.cloudName!==expectedCloudName)stop('CONFIGURED_CLOUD_NAME_MISMATCH','INPUT_VALIDATION');
  if(typeof input.apiKey!=='string'||!/^\d{5,40}$/.test(input.apiKey))stop('API_KEY_FORMAT_INVALID','INPUT_VALIDATION');
  if(typeof input.apiSecret!=='string'||input.apiSecret.length<10||input.apiSecret.length>256||/[\r\n]/.test(input.apiSecret)||input.apiSecret!==input.apiSecret.trim())stop('API_SECRET_FORMAT_INVALID','INPUT_VALIDATION');
}
export function signParameters(parameters,secret) {
  const canonical=Object.keys(parameters).sort().map(key=>`${key}=${parameters[key]}`.replaceAll('&','%26')).join('&');
  return createHash('sha256').update(canonical+secret).digest('hex');
}
export async function inspectImage(data) {
  const image=sharp(data,{limitInputPixels:40000000});const metadata=await image.metadata();
  if(metadata.pages&&metadata.pages!==1)stop('MULTIPAGE_IMAGE_NOT_APPROVED');
  const {data:pixels,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);
  const alpha={transparentPixels:0,partiallyTransparentPixels:0,opaquePixels:0};
  for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)alpha.transparentPixels++;else if(pixels[i]===255)alpha.opaquePixels++;else alpha.partiallyTransparentPixels++;}
  return {format:metadata.format,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,
    bytes:data.length,sha256:sha256(data),rgbaSha256:sha256(pixels),alpha};
}
async function boundedBody(response,limit) {
  if(Number(response.headers.get('content-length'))>limit)stop('RESPONSE_TOO_LARGE');
  const reader=response.body?.getReader();if(!reader)stop('MISSING_RESPONSE_BODY');
  const parts=[];let size=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)stop('RESPONSE_TOO_LARGE');parts.push(Buffer.from(value));}}
  finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  return Buffer.concat(parts);
}

// This operator client deliberately exposes no delete, overwrite, preset, role,
// database or arbitrary endpoint operation. Secrets never enter its reports.
export function cloudinaryClient(credentials,plans,{fetchImpl=fetch,now=()=>Date.now()}={}) {
  const {cloudName,apiKey,apiSecret}=credentials;
  assert.match(cloudName,/^[a-z0-9_-]+$/i);assert.match(apiKey,/^[0-9]{5,40}$/);
  assert.ok(typeof apiSecret==='string'&&apiSecret.length>=10&&apiSecret.length<=256&&!/[\r\n]/.test(apiSecret)&&apiSecret===apiSecret.trim());
  assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0',false);
  assert.equal(plans.length,3);assert.equal(new Set(plans.map(p=>p.key)).size,3);
  for(const plan of plans)assert.deepEqual(plan,planAsset(plan));
  const allowed=new Map(plans.map(plan=>[plan.publicId,plan]));assert.equal(allowed.size,3);
  const root=`https://api.cloudinary.com/v1_1/${cloudName}`;
  const auth='Basic '+Buffer.from(apiKey+':'+apiSecret).toString('base64');
  async function request(url,init,operation,allow404=false) {
    let response;
    try{response=await fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.timeout(45000)});}
    catch{stop('API_OUTCOME_UNKNOWN',operation);}
    if(allow404&&response.status===404){await response.body?.cancel();return null;}
    if(response.status!==200){await response.body?.cancel();stop(`API_HTTP_${response.status}`,operation);}
    try {return JSON.parse((await boundedBody(response,1024*1024)).toString('utf8'));}
    catch(error){if(error.code==='RESPONSE_TOO_LARGE')stop('RESPONSE_TOO_LARGE',operation);stop('INVALID_API_RESPONSE',operation);}
  }
  async function lookup(publicId) {
    assert.ok(allowed.has(publicId));
    return request(`${root}/resources/image/upload/${encodeURIComponent(publicId)}?context=true`,{method:'GET',headers:{Authorization:auth}},'CLOUDINARY_ASSET_LOOKUP',true);
  }
  async function upload(plan,bytes) {
    assert.deepEqual(plan,allowed.get(plan.publicId));
    assert.equal(bytes.length,plan.storedBytes);assert.equal(sha256(bytes),plan.sha256);
    const parameters={...plan.parameters,timestamp:String(Math.floor(now()/1000))};
    const body=new FormData();
    for(const [key,value] of Object.entries(parameters))body.set(key,value);
    body.set('api_key',apiKey);body.set('signature',signParameters(parameters,apiSecret));
    body.set('file',new Blob([bytes],{type:'image/png'}),'approved.png');
    return request(`${root}/image/upload`,{method:'POST',body},'CLOUDINARY_SIGNED_UPLOAD');
  }
  async function ping(){const result=await request(`${root}/ping`,{method:'GET',headers:{Authorization:auth}},'CLOUDINARY_ADMIN_PING');if(result.status!=='ok')stop('ACCOUNT_PING_FAILED','CLOUDINARY_ADMIN_PING');return {authenticated:true};}
  async function download(url) {
    const target=new URL(url);
    assert.equal(target.origin,'https://res.cloudinary.com');assert.equal(target.username,'');assert.equal(target.password,'');assert.equal(target.search,'');assert.equal(target.hash,'');
    const approved=plans.some(p=>new RegExp(`^/${cloudName}/image/upload/(?:f_auto,q_auto(?:,w_260,c_limit)?/)?v[1-9][0-9]*/${p.publicId}\\.png$`).test(target.pathname));
    assert.ok(approved);
    let response;try{response=await fetchImpl(target.href,{method:'GET',redirect:'error',signal:AbortSignal.timeout(45000),headers:{Accept:'image/png'}});}catch{stop('DELIVERY_REQUEST_FAILED');}
    if(response.status!==200){await response.body?.cancel();stop(`DELIVERY_HTTP_${response.status}`);}
    const data=await boundedBody(response,8*1024*1024);
    return {httpStatus:200,contentType:response.headers.get('content-type'),accept:'image/png',...await inspectImage(data)};
  }
  return {ping,lookup,upload,download,cloudName};
}

export async function verifyAsset(client,plan,resource,sourceEvidence) {
  // Reject untrusted metadata/URLs BEFORE fetching; only missing download proof
  // is allowed at this preliminary metadata gate.
  const preliminary=assessAsset(plan,client.cloudName,resource,{httpStatus:200,contentType:'image/png',format:'png',width:plan.width,height:plan.height,bytes:resource.bytes,sha256:plan.sha256});
  if(preliminary.status==='CONFLICT')stop('EXISTING_ASSET_CONFLICT');
  const master=await client.download(resource.secure_url);
  const evidence=assessAsset(plan,client.cloudName,resource,master);
  if(evidence.status!=='VERIFIED')stop(evidence.status==='NEEDS_REVIEW'?'MASTER_REQUIRES_REVIEW':'ASSET_VERIFICATION_FAILED');
  assert.equal(sourceEvidence.sha256,plan.sha256);
  if(master.hasAlpha!==sourceEvidence.hasAlpha||master.rgbaSha256!==sourceEvidence.rgbaSha256||JSON.stringify(master.alpha)!==JSON.stringify(sourceEvidence.alpha))stop('MASTER_PIXELS_OR_TRANSPARENCY_MISMATCH');
  const delivery=await client.download(evidence.mapping.targetUrl);
  if(!['image/png','image/webp','image/avif','image/jpeg'].includes(delivery.contentType?.split(';')[0].trim().toLowerCase())||!['png','webp','avif','heif','jpeg'].includes(delivery.format))stop('DELIVERY_FORMAT_INVALID');
  const expectedWidth=plan.key==='favicon'?plan.width:Math.min(260,plan.width);
  const expectedHeight=Math.round(plan.height*expectedWidth/plan.width);
  if(delivery.width!==expectedWidth||delivery.height!==expectedHeight)stop('DELIVERY_DIMENSIONS_INVALID');
  if(sourceEvidence.alpha.transparentPixels+sourceEvidence.alpha.partiallyTransparentPixels>0&&(!delivery.hasAlpha||delivery.alpha.transparentPixels+delivery.alpha.partiallyTransparentPixels===0))stop('DELIVERY_TRANSPARENCY_LOST');
  if(delivery.alpha.opaquePixels+delivery.alpha.partiallyTransparentPixels===0)stop('DELIVERY_IMAGE_EMPTY');
  if(plan.key==='favicon'&&delivery.format!=='png')stop('FAVICON_PNG_DELIVERY_NOT_VERIFIED');
  return {...evidence,master,delivery};
}

export async function uploadApprovedAssets(client,sources,journal=()=>{}) {
  assert.equal(sources.length,3);
  const existing=new Map(),results=[];
  // Inspect and verify every collision before making any new upload.
  for(const {plan,sourceEvidence} of sources){assert.equal(sourceEvidence.sha256,plan.sha256);const resource=await client.lookup(plan.publicId);existing.set(plan.publicId,resource);if(resource)await verifyAsset(client,plan,resource,sourceEvidence);}
  for(const {plan,bytes,sourceEvidence} of sources) {
    let resource=existing.get(plan.publicId),action='REUSED';
    if(!resource) {
      action='UPLOADED';journal({key:plan.key,publicId:plan.publicId,state:'UPLOAD_STARTED'});
      try {await client.upload(plan,bytes);}
      catch(error) {
        journal({key:plan.key,publicId:plan.publicId,state:'UPLOAD_OUTCOME_UNKNOWN'});
        // Never blindly retry a POST. A timeout/race can already have created
        // the asset; reconcile the same public ID through authoritative GET.
        resource=await client.lookup(plan.publicId);
        if(!resource)throw error;
        action='RECONCILED';
      }
      resource??=await client.lookup(plan.publicId);
      if(!resource)stop('UPLOAD_NOT_FOUND_ON_RECHECK');
    }
    const evidence=await verifyAsset(client,plan,resource,sourceEvidence);
    const result={key:plan.key,action,...evidence};results.push(result);
    journal({key:plan.key,publicId:plan.publicId,state:'VERIFIED',action,asset:evidence.asset,master:evidence.master,delivery:evidence.delivery});
  }
  return results;
}
