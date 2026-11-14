import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {planAsset} from '../../scripts/launch05e-media-plan.mjs';
import cloudinary from 'cloudinary';
import {cloudinaryClient,uploadApprovedAssets,signParameters,verifyAsset,inspectImage,validateUploadCredentials} from '../../scripts/launch05f-cloudinary.mjs';

const credentials={cloudName:'synthetic',apiKey:'123456789',apiSecret:'rotated-synthetic-secret'};
async function fixtures() {
  return Promise.all(['websiteLogo','footerLogo','favicon'].map(async(key,i)=>{
    const bytes=await sharp({create:{width:32,height:32,channels:4,background:{r:i*50,g:30,b:40,alpha:0.7}}}).png().toBuffer();
    const plan=planAsset({key,mediaId:`synthetic-${i}`,sourceUrl:`/uploads/media/synthetic-${i}.png`,sha256:createHash('sha256').update(bytes).digest('hex'),storedBytes:bytes.length,format:'png',width:32,height:32});
    const resource={public_id:plan.publicId,asset_id:`asset-${i}`,version:7,resource_type:'image',type:'upload',format:'png',width:32,height:32,bytes:bytes.length,
      secure_url:`https://res.cloudinary.com/synthetic/image/upload/v7/${plan.publicId}.png`,context:{custom:{recon_source_sha256:plan.sha256,recon_plan:plan.planVersion}},api_key:'NEVER-PERSIST-THIS'};
    return {plan,bytes,resource,sourceEvidence:await inspectImage(bytes)};
  }));
}
function harness(sources,{existing=[],authStatus=200,timeoutAfterCreate=false}={}) {
  const store=new Map(existing.map(resource=>[resource.public_id,resource]));const calls=[];
  const fetchImpl=async(url,init)=>{
    const target=new URL(url);calls.push({url,method:init.method,body:init.body,headers:init.headers,redirect:init.redirect});
    assert.equal(init.redirect,'error');assert.ok(init.signal);
    if(target.hostname==='res.cloudinary.com') {
      assert.equal(init.headers.Authorization,undefined);
      const source=sources.find(s=>target.pathname.endsWith(`/${s.plan.publicId}.png`));assert.ok(source);
      return new Response(source.bytes,{status:200,headers:{'content-type':'image/png'}});
    }
    assert.equal(target.origin,'https://api.cloudinary.com');assert.ok(target.pathname.startsWith('/v1_1/synthetic/'));
    if(authStatus!==200)return new Response('secret error deliberately suppressed',{status:authStatus});
    if(target.pathname.endsWith('/ping'))return Response.json({status:'ok'});
    if(init.method==='GET') {
      assert.equal(init.headers.Authorization,'Basic '+Buffer.from(credentials.apiKey+':'+credentials.apiSecret).toString('base64'));
      assert.equal(target.search,'?context=true');
      const publicId=decodeURIComponent(target.pathname.split('/resources/image/upload/')[1]);
      return store.has(publicId)?Response.json(store.get(publicId)):new Response('{}',{status:404});
    }
    assert.equal(init.method,'POST');assert.equal(target.pathname,'/v1_1/synthetic/image/upload');
    const form=init.body,publicId=form.get('public_id'),source=sources.find(s=>s.plan.publicId===publicId);assert.ok(source);
    assert.equal(form.get('overwrite'),'false');assert.equal(form.get('unique_filename'),'false');assert.equal(form.get('use_filename'),'false');
    assert.deepEqual(Buffer.from(await form.get('file').arrayBuffer()),source.bytes);
    const params=Object.fromEntries([...form.entries()].filter(([key])=>!['file','signature','api_key'].includes(key)));
    assert.equal(form.get('signature'),signParameters(params,credentials.apiSecret));
    assert.equal(form.get('api_key'),credentials.apiKey);assert.ok(!form.has('upload_preset')&&!form.has('folder'));
    if(!store.has(publicId))store.set(publicId,source.resource);
    if(timeoutAfterCreate)throw Error('simulated transport error containing a secret');
    return Response.json({...store.get(publicId),existing:true});
  };
  return {client:cloudinaryClient(credentials,sources.map(s=>s.plan),{fetchImpl,now:()=>1700000000000}),calls,store};
}
test('SHA-256 signatures use sorted exact upload parameters',()=>{
  assert.equal(signParameters({z:'false',a:'x'},'secret'),createHash('sha256').update('a=x&z=falsesecret').digest('hex'));
});
test('only three approved plans can be passed to the narrow client',async()=>{
  const sources=await fixtures();
  assert.throws(()=>cloudinaryClient(credentials,sources.slice(0,2).map(s=>s.plan)));
  assert.throws(()=>cloudinaryClient(credentials,sources.map((s,i)=>i? s.plan:{...s.plan,parameters:{...s.plan.parameters,overwrite:'true'}})));
  assert.throws(()=>cloudinaryClient({...credentials,cloudName:'synthetic.invalid'},sources.map(s=>s.plan)));
});
test('authenticated lookup precedes signed upload; round-trip master and app variants produce credential-free evidence',async()=>{
  const sources=await fixtures(),h=harness(sources),journal=[];
  assert.deepEqual(await h.client.ping(),{authenticated:true});
  const result=await uploadApprovedAssets(h.client,sources,event=>journal.push(event));
  assert.equal(result.length,3);assert.ok(result.every(r=>r.status==='VERIFIED'&&r.action==='UPLOADED'));
  const firstPost=h.calls.findIndex(c=>c.method==='POST');
  assert.equal(h.calls.slice(0,firstPost).filter(c=>c.url.includes('/resources/')).length,3);
  assert.equal(h.calls.filter(c=>c.method==='POST').length,3);
  for(const text of [JSON.stringify(result),JSON.stringify(journal)])for(const secret of ['NEVER-PERSIST-THIS',credentials.apiKey,credentials.apiSecret])assert.ok(!text.includes(secret));
});
test('repeat execution verifies and reuses the same assets without another POST',async()=>{
  const sources=await fixtures(),h=harness(sources);
  await uploadApprovedAssets(h.client,sources);const previous=h.calls.length;
  const result=await uploadApprovedAssets(h.client,sources);
  assert.ok(result.every(r=>r.action==='REUSED'));assert.equal(h.calls.slice(previous).filter(c=>c.method==='POST').length,0);
});
test('authentication failure is never treated as asset absence',async()=>{
  const sources=await fixtures(),h=harness(sources,{authStatus:401});
  await assert.rejects(()=>uploadApprovedAssets(h.client,sources),{code:'API_HTTP_401'});
  assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});
test('rate limit or server error never permits creation',async()=>{
  for(const authStatus of [429,500]){
    const sources=await fixtures(),h=harness(sources,{authStatus});
    await assert.rejects(()=>uploadApprovedAssets(h.client,sources),{code:`API_HTTP_${authStatus}`});
    assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
  }
});
test('a conflicting pre-existing asset aborts before any new asset is uploaded',async()=>{
  const sources=await fixtures(),h=harness(sources,{existing:[{...sources[1].resource,context:{}}]});
  await assert.rejects(()=>uploadApprovedAssets(h.client,sources),{code:'EXISTING_ASSET_CONFLICT'});
  assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});
test('an unknown upload outcome reconciles the same ID and never resends a POST',async()=>{
  const sources=await fixtures(),h=harness(sources,{timeoutAfterCreate:true}),events=[];
  const result=await uploadApprovedAssets(h.client,sources,event=>events.push(event));
  assert.ok(result.every(r=>r.action==='RECONCILED'));assert.equal(h.calls.filter(c=>c.method==='POST').length,3);
  assert.equal(events.filter(e=>e.state==='UPLOAD_OUTCOME_UNKNOWN').length,3);
});
test('nonmatching master bytes cannot be mapped even with correct context/dimensions',async()=>{
  const sources=await fixtures();
  const changed=await sharp(sources[0].bytes).png({compressionLevel:0}).toBuffer();
  const resource={...sources[0].resource,bytes:changed.length};
  const original=sources[0].bytes;sources[0].bytes=changed;
  const h=harness(sources,{existing:[resource]});
  await assert.rejects(()=>verifyAsset(h.client,sources[0].plan,resource,sources[0].sourceEvidence),{code:'MASTER_REQUIRES_REVIEW'});
  sources[0].bytes=original;assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});
test('untrusted URLs, credentials in URLs and non-allowlisted IDs are refused before network access',async()=>{
  const sources=await fixtures(),h=harness(sources);
  for(const url of ['http://res.cloudinary.com/synthetic/image/upload/x','https://res.cloudinary.com.evil.invalid/x','https://user:secret@res.cloudinary.com/x',sources[0].resource.secure_url+'?key=secret'])await assert.rejects(()=>h.client.download(url));
  await assert.rejects(()=>h.client.lookup('unrelated'));
  await assert.rejects(()=>verifyAsset(h.client,sources[0].plan,{...sources[0].resource,secure_url:'https://evil.invalid/x'},sources[0].sourceEvidence),{code:'EXISTING_ASSET_CONFLICT'});
  assert.equal(h.calls.length,0);
});
test('changed source content is rejected before POST',async()=>{
  const sources=await fixtures(),h=harness(sources);
  await assert.rejects(()=>h.client.upload(sources[0].plan,Buffer.from('wrong bytes')));
  assert.equal(h.calls.length,0);
});
test('oversized responses fail closed and do not leak provider errors',async()=>{
  const sources=await fixtures(),client=cloudinaryClient(credentials,sources.map(s=>s.plan),{fetchImpl:async()=>new Response('{}',{headers:{'content-length':'9999999'}})});
  await assert.rejects(()=>client.ping(),{code:'RESPONSE_TOO_LARGE'});
});
test('signatures match the installed official SDK SHA-256 implementation including parameter smuggling protection',async()=>{
  for(const source of await fixtures()){
    const parameters={...source.plan.parameters,timestamp:'1700000000'};
    assert.equal(signParameters(parameters,credentials.apiSecret),cloudinary.utils.api_sign_request(parameters,credentials.apiSecret,'sha256'));
  }
  assert.equal(signParameters({context:'a=b&overwrite=true'},credentials.apiSecret),cloudinary.utils.api_sign_request({context:'a=b&overwrite=true'},credentials.apiSecret,'sha256'));
});
test('credential validation names confirmation errors without leaking values',()=>{
  const input={...credentials,confirmCloudName:credentials.cloudName,newlyRotated:true};
  assert.doesNotThrow(()=>validateUploadCredentials(input));
  assert.throws(()=>validateUploadCredentials({...input,confirmCloudName:'different'}),{code:'CLOUD_NAME_CONFIRMATION_MISMATCH',operation:'INPUT_VALIDATION'});
  assert.throws(()=>validateUploadCredentials(input,'other'),{code:'CONFIGURED_CLOUD_NAME_MISMATCH'});
  assert.throws(()=>validateUploadCredentials({...input,apiSecret:' invalid-whitespace '}),{code:'API_SECRET_FORMAT_INVALID'});
});
test('401 identifies ping versus resource lookup and never creates an asset',async()=>{
  const sources=await fixtures(),h=harness(sources,{authStatus:401});
  await assert.rejects(()=>h.client.ping(),{code:'API_HTTP_401',operation:'CLOUDINARY_ADMIN_PING'});
  await assert.rejects(()=>h.client.lookup(sources[0].plan.publicId),{code:'API_HTTP_401',operation:'CLOUDINARY_ASSET_LOOKUP'});
  assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});
test('decoded image evidence distinguishes alpha channels from actual transparent pixels',async()=>{
  const [{sourceEvidence}]=await fixtures();assert.equal(sourceEvidence.hasAlpha,true);assert.equal(sourceEvidence.alpha.partiallyTransparentPixels,1024);
  const opaque=await inspectImage(await sharp({create:{width:8,height:8,channels:4,background:{r:20,g:30,b:40,alpha:1}}}).png().toBuffer());
  assert.equal(opaque.hasAlpha,true);assert.equal(opaque.alpha.opaquePixels,64);assert.equal(opaque.alpha.transparentPixels,0);
});
test('a delivery derivative that flattens transparency or has the wrong dimensions cannot be mapped',async()=>{
  for(const change of [{hasAlpha:false,alpha:{transparentPixels:0,partiallyTransparentPixels:0,opaquePixels:1024}},{width:1,height:1}]){
    const sources=await fixtures(),h=harness(sources);const original=h.client.download;
    h.client.download=async url=>({...await original(url),...(url.includes('f_auto,q_auto')?change:{})});
    await assert.rejects(()=>verifyAsset(h.client,sources[0].plan,sources[0].resource,sources[0].sourceEvidence),{code:change.width?'DELIVERY_DIMENSIONS_INVALID':'DELIVERY_TRANSPARENCY_LOST'});
  }
});
