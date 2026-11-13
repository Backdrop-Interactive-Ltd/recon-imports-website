import test from 'node:test';
import assert from 'node:assert/strict';
import {securityQueries,collectSecurity,assessSecurity} from '../../scripts/launch05c-preflight.mjs';
import {privateRun} from '../../scripts/launch05a-common.mjs';
import {mapActiveMedia} from '../../scripts/launch05c-media.mjs';

const baseline={migrationReadiness:'PRECHECKS_PASS_EXECUTION_NOT_AUTHORIZED'};
const empty=()=>({objects:[],schemaPrivileges:[],forecast:[],tablePrivileges:[],roles:[],identity:[]});

test('production security inspection issues only catalog reads and excludes secret-bearing fields',async()=>{
  const calls=[];
  const result=await collectSecurity({query:async(sql,params)=>{calls.push({sql,params});return {rows:[]};}});
  assert.equal(calls.length,Object.keys(securityQueries).length);
  assert.deepEqual(Object.keys(result),Object.keys(securityQueries));
  for(const {sql} of calls) {
    assert.match(sql.trim(),/^(SELECT|WITH)\b/i);
    assert.doesNotMatch(sql,/;|\b(?:pg_authid|rolpassword|pg_get_functiondef|prosrc|nextval|setval|pg_reload_conf)\b|jwt_secret|api_key|passwordHash/i);
  }
});
test('API future-object privileges block production writes even on an empty target',()=>{
  const security=empty();
  security.forecast=[{role:'anon',kind:'r',privilege_type:'SELECT'},{role:'authenticated',kind:'f',privilege_type:'EXECUTE'}];
  const report=assessSecurity(baseline,security);
  assert.equal(report.productionWritesReady,false);
  assert.ok(report.blockers.includes('CREATOR_DEFAULTS_GRANT_FUTURE_APPLICATION_OBJECTS_TO_API_ROLES'));
  assert.ok(report.blockers.includes('FUTURE_FUNCTION_EXECUTION_GRANTS_REQUIRE_REVIEW'));
});
test('empty grants never imply a verified Data API control plane or safe runtime credential',()=>{
  const report=assessSecurity(baseline,empty());
  assert.equal(report.productionWritesReady,false);
  assert.equal(report.migrationCredentialSuitableForRuntime,false);
  assert.ok(report.blockers.includes('DATA_API_CONTROL_PLANE_STATUS_NOT_VERIFIED'));
});
test('owner Dashboard attestation resolves only the API toggle, preserving privilege/runtime blockers',()=>{
  const security=empty();security.forecast=[{role:'anon',kind:'r',privilege_type:'SELECT'}];
  const report=assessSecurity(baseline,security,{dataApiDisabledByOwner:true});
  assert.match(report.dataApiStatus,/OWNER_CONFIRMED_OFF/);
  assert.ok(!report.blockers.includes('DATA_API_CONTROL_PLANE_STATUS_NOT_VERIFIED'));
  assert.ok(report.blockers.includes('CREATOR_DEFAULTS_GRANT_FUTURE_APPLICATION_OBJECTS_TO_API_ROLES'));
  assert.ok(report.blockers.includes('DEDICATED_RUNTIME_ROLE_AND_HYPERDRIVE_ORIGIN_NOT_VERIFIED'));
  assert.equal(report.productionWritesReady,false);
});
test('privileged migration role, unexpected public objects and API schema creation are reported',()=>{
  const security=empty();
  security.identity=[{current_role:'synthetic_migrator'}];
  security.roles=[{role:'synthetic_migrator',rolsuper:false,rolcreatedb:true,rolcreaterole:true,rolbypassrls:true}];
  security.objects=[{name:'unexpected',extension_owned:false}];
  security.schemaPrivileges=[{role:'anon',schema:'public',create:true}];
  security.tablePrivileges=[{role:'authenticated',allowed:true}];
  const report=assessSecurity(baseline,security);
  assert.equal(report.migrationCredentialSuitableForRuntime,false);
  for(const code of ['PUBLIC_SCHEMA_HAS_NON_EXTENSION_OBJECTS','API_ROLE_CAN_CREATE_PUBLIC_OBJECTS','EXISTING_PUBLIC_TABLE_API_GRANTS_REQUIRE_REVIEW']) assert.ok(report.blockers.includes(code));
});
test('private workflow cannot be redirected to an arbitrary filesystem scope',()=>{
  assert.throws(()=>privateRun('synthetic','../../outside'));
});

function syntheticMedia() {
  const keys=['websiteLogo','footerLogo','favicon'];
  const settings=keys.map((key,i)=>({id:`setting-${i}`,key,value:`/uploads/media/synthetic-${i}.png`,type:'IMAGE_URL',createdAt:'synthetic-created',updatedAt:'synthetic-updated'}));
  settings.push({id:'contact',key:'contact',value:'synthetic contact',type:'STRING'});
  const media=keys.map((_,i)=>({id:`media-${i}`,fileUrl:settings[i].value,size:123,fileName:`synthetic-${i}.png`,createdAt:'synthetic-created',updatedAt:'synthetic-updated'}));
  media.push({id:'historical',fileUrl:'/uploads/media/historical.png'});
  const mappings=media.slice(0,3).map((row,i)=>({mediaId:row.id,sourceUrl:row.fileUrl,targetUrl:`https://res.cloudinary.com/synthetic/image/upload/v1/synthetic-${i}.png`}));
  return {settings,media,mappings};
}
test('media payload mapping preserves IDs and every field except the approved URLs without mutating source',()=>{
  const source=syntheticMedia(),before=structuredClone(source);
  const result=mapActiveMedia(source.settings,source.media,source.mappings,'synthetic');
  assert.deepEqual(source,before);
  assert.equal(result.media.length,3);
  for(let i=0;i<3;i++) {
    assert.deepEqual(result.media[i],{...source.media[i],fileUrl:source.mappings[i].targetUrl});
    assert.deepEqual(result.settings[i],{...source.settings[i],value:source.mappings[i].targetUrl});
  }
  assert.deepEqual(result.settings[3],source.settings[3]);
});
test('media mapping rejects cross-account/lookalike/unversioned URLs and missing, duplicate or mismatched IDs',()=>{
  for(const replacement of ['https://res.cloudinary.com.evil.invalid/synthetic/image/upload/v1/a.png','http://res.cloudinary.com/synthetic/image/upload/v1/a.png',
    'https://res.cloudinary.com/another/image/upload/v1/a.png','https://res.cloudinary.com/synthetic/image/upload/a.png','https://res.cloudinary.com/synthetic/image/upload/v1/a.png?token=synthetic']) {
    const s=syntheticMedia();s.mappings[0].targetUrl=replacement;
    assert.throws(()=>mapActiveMedia(s.settings,s.media,s.mappings,'synthetic'));
  }
  for(const change of [s=>s.mappings.pop(),s=>{s.mappings[0].mediaId='unknown';},s=>{s.mappings[0].sourceUrl='/uploads/mismatched.png';},s=>{s.mappings[0].mediaId=s.mappings[1].mediaId;}]) {
    const s=syntheticMedia();change(s);assert.throws(()=>mapActiveMedia(s.settings,s.media,s.mappings,'synthetic'));
  }
});
