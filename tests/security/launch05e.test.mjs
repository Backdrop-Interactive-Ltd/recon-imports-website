import test from 'node:test';
import assert from 'node:assert/strict';
import {planAsset,assessAsset} from '../../scripts/launch05e-media-plan.mjs';
import {mapActiveMedia} from '../../scripts/launch05c-media.mjs';

function fixture(index=0) {
  const source={key:['websiteLogo','footerLogo','favicon'][index],mediaId:'synthetic-media-'+index,sourceUrl:`/uploads/media/synthetic-${index}.png`,sha256:String(index+1).repeat(64),storedBytes:123,format:'png',width:32,height:32};
  const plan=planAsset(source);
  const resource={public_id:plan.publicId,asset_id:'synthetic-asset-'+index,version:1,resource_type:'image',type:'upload',format:'png',bytes:123,width:32,height:32,
    secure_url:`https://res.cloudinary.com/synthetic/image/upload/v1/${plan.publicId}.png`,context:{custom:{recon_source_sha256:source.sha256,recon_plan:plan.planVersion}}};
  const download={httpStatus:200,contentType:'image/png',format:'png',bytes:123,width:32,height:32,sha256:source.sha256};
  return {source,plan,resource,download};
}
test('stable per-record/content IDs make retries deterministic and prohibit overwriting or random suffixes',()=>{
  const f=fixture(),before=structuredClone(f.source);
  assert.deepEqual(planAsset(f.source),f.plan);assert.deepEqual(f.source,before);
  assert.notEqual(planAsset({...f.source,mediaId:'different'}).publicId,f.plan.publicId);
  assert.notEqual(planAsset({...f.source,sha256:'a'.repeat(64)}).publicId,f.plan.publicId);
  assert.equal(f.plan.parameters.overwrite,'false');assert.equal(f.plan.parameters.unique_filename,'false');assert.equal(f.plan.parameters.use_filename,'false');
  assert.match(f.plan.publicId,/^recon-imports\/branding\/migration-v1\/[a-f0-9]{64}$/);
});
test('plans reject unknown branding roles, nonlocal references, unsupported format and invalid source evidence',()=>{
  const {source}=fixture();
  for(const change of [{key:'unapproved'},{mediaId:''},{sourceUrl:'https://example.invalid/private.png'},{format:'jpeg'},{sha256:'unverified'},{width:0},{height:-1},{storedBytes:0}])assert.throws(()=>planAsset({...source,...change}));
});
test('fresh and existing assets require the same authoritative metadata and original-master proof',()=>{
  const f=fixture();const expected=assessAsset(f.plan,'synthetic',f.resource,f.download);
  assert.equal(expected.status,'VERIFIED');
  assert.deepEqual(assessAsset(f.plan,'synthetic',{...f.resource,existing:true},f.download),expected);
  assert.equal(assessAsset(f.plan,'synthetic',{existing:true},f.download).status,'CONFLICT');
  assert.equal(assessAsset(f.plan,'synthetic',{...f.resource,context:{}},f.download).status,'CONFLICT');
});
test('wrong account, identity, delivery type, overwrite or source context never creates a usable mapping',()=>{
  const f=fixture();
  for(const change of [{public_id:'unrelated'},{resource_type:'raw'},{type:'private'},{asset_id:''},{version:0},{overwritten:true},
    {secure_url:f.resource.secure_url.replace('/synthetic/','/other/')},{context:{custom:{recon_source_sha256:'b'.repeat(64),recon_plan:f.plan.planVersion}}}]) {
    const report=assessAsset(f.plan,'synthetic',{...f.resource,...change},f.download);assert.equal(report.status,'CONFLICT');assert.ok(!report.mapping);
  }
});
test('master validation rejects lookalike hosts, transformed delivery, failed downloads and dimension mismatch',()=>{
  const f=fixture();
  for(const url of [f.resource.secure_url.replace('res.cloudinary.com','res.cloudinary.com.evil.invalid'),f.resource.secure_url.replace('https:','http:'),
    f.resource.secure_url.replace('/upload/','/upload/f_auto,q_auto/'),f.resource.secure_url+'?token=synthetic']) assert.equal(assessAsset(f.plan,'synthetic',{...f.resource,secure_url:url},f.download).status,'CONFLICT');
  for(const change of [{httpStatus:404},{contentType:'image/jpeg'},{width:64},{format:'webp'}])assert.equal(assessAsset(f.plan,'synthetic',f.resource,{...f.download,...change}).status,'CONFLICT');
});
test('byte normalization or checksum mismatch needs explicit review rather than automatic reuse',()=>{
  const f=fixture();
  const changed=assessAsset(f.plan,'synthetic',f.resource,{...f.download,sha256:'c'.repeat(64)});
  assert.equal(changed.status,'NEEDS_REVIEW');assert.ok(!changed.mapping);
  assert.equal(assessAsset(f.plan,'synthetic',{...f.resource,bytes:124},{...f.download,bytes:124}).status,'NEEDS_REVIEW');
  assert.equal(assessAsset(f.plan,'synthetic',f.resource,{...f.download,bytes:124}).status,'CONFLICT');
});
test('verified evidence feeds existing ID-preserving mapping and drops provider credentials from its output',()=>{
  const fixtures=[0,1,2].map(fixture);
  const results=fixtures.map(f=>assessAsset(f.plan,'synthetic',{...f.resource,api_key:'synthetic-secret-not-for-report'},f.download));
  assert.ok(results.every(r=>r.status==='VERIFIED'));
  assert.ok(!JSON.stringify(results).includes('synthetic-secret-not-for-report'));
  const settings=fixtures.map((f,i)=>({id:'setting-'+i,key:f.source.key,value:f.source.sourceUrl,type:'IMAGE_URL',createdAt:'synthetic'}));
  const media=fixtures.map(f=>({id:f.source.mediaId,fileUrl:f.source.sourceUrl,size:111,updatedAt:'synthetic'}));
  const mapped=mapActiveMedia(settings,media,results.map(r=>r.mapping),'synthetic');
  assert.deepEqual(mapped.media.map(r=>r.id),media.map(r=>r.id));assert.deepEqual(mapped.settings.map(r=>r.id),settings.map(r=>r.id));
  assert.ok(mapped.media.every(r=>r.size===111&&r.updatedAt==='synthetic'));
});
test('planned variants match the actual settings image helpers and remain stable across a later admin save',async()=>{
  const {getLogoImageUrl,getOptimizedCloudinaryImageUrl}=await import('../../lib/cloudinaryImages.ts');
  for(const f of [0,1,2].map(fixture)) {
    const result=assessAsset(f.plan,'synthetic',f.resource,f.download);
    const normalize=f.source.key==='favicon'?getOptimizedCloudinaryImageUrl:getLogoImageUrl;
    assert.equal(result.mapping.targetUrl,normalize(result.asset.masterUrl));
    assert.equal(normalize(result.mapping.targetUrl),result.mapping.targetUrl);
    assert.equal(result.asset.masterUrl,f.resource.secure_url);
  }
});
