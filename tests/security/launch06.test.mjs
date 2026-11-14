import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {assertPreflight} from '../../scripts/launch06-preflight.mjs';
import {sha256} from '../../scripts/launch05a-common.mjs';
import {preparePayload,readVerifiedLocalAdminPassword} from '../../scripts/launch06-payload.mjs';
import {requireWriteAuthorization,importApprovedRows,assertExecutionNotStopped} from '../../scripts/launch06-execute.mjs';
import {missingRolePasswords,requirePasswordOnlyAuthorization,verifyReadOnlyRoleLogin,verifiedBackupMetadata,requireRuntimePasswordAuthorization,assertRuntimePasswordScope} from '../../scripts/launch06-role-passwords.mjs';
import {sealJson} from '../../scripts/launch05g-crypto.mjs';
fs.mkdirSync(path.resolve('.local/launch06'),{recursive:true});
test('backup key failures have an exact safe code and tampered archives remain distinct',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch06-key-'));
  try{
    const file=path.join(dir,'synthetic.enc'),key=randomBytes(24).toString('base64url');sealJson({synthetic:true},file,key);const digest=sha256(fs.readFileSync(file));
    assert.deepEqual(verifiedBackupMetadata(file,key,digest),{synthetic:true});
    assert.throws(()=>verifiedBackupMetadata(file,'incorrect-synthetic-passphrase',digest),{code:'BACKUP_KEY_NOT_VERIFIED'});
    assert.throws(()=>verifiedBackupMetadata(file,key,'incorrect-checksum'),{code:'ERR_ASSERTION'});
  }finally{assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('recon-launch06-key-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('role login verification explicitly enforces read-only transactions when startup options are omitted',async()=>{
  const queries=[],observed=[];const client={connection:{stream:{authorized:true}},connect:async()=>{},end:async()=>{},query:async sql=>{
    queries.push(sql);
    if(sql.startsWith('SELECT current_user'))return {rows:[{role:'recon_migrator',database:'postgres',version:'17.11',readonly:'off'}]};
    if(sql.startsWith('SELECT current_setting'))return {rows:[{readonly:'on'}]};return {};
  }};
  const result=await verifyReadOnlyRoleLogin({user:'postgres.synthetic'},'recon_migrator','synthetic-private-password',value=>observed.push(value),()=>client);
  assert.equal(result.startupReadOnly,false);assert.equal(result.explicitTransactionReadOnly,true);assert.equal(result.readOnlyLoginVerified,true);
  assert.ok(queries.includes('BEGIN READ ONLY'));assert.equal(queries.at(-1),'ROLLBACK');assert.ok(queries.every(sql=>/^(SELECT|BEGIN READ ONLY|ROLLBACK)/.test(sql)));
  assert.ok(!JSON.stringify(observed).includes('synthetic-private-password'));
});
test('credential rejection and wrong-role failures retain distinct safe stages without exposing secrets',async()=>{
  for(const reject of [true,false]){
    let latest;const client={connection:{stream:{authorized:true}},connect:async()=>{if(reject)throw Object.assign(Error('suppressed synthetic details'),{code:'28P01'});},end:async()=>{},query:async()=>({rows:[{role:'unexpected',database:'postgres',version:'17.11',readonly:'off'}]})};
    await assert.rejects(()=>verifyReadOnlyRoleLogin({user:'postgres.synthetic'},'recon_migrator','synthetic-private-password',value=>{latest=value;},()=>client));
    assert.equal(latest.stage,reject?'role-authentication':'role-identity');if(!reject)assert.equal(latest.reportedRoleMatches,false);
    assert.ok(!JSON.stringify(latest).includes('synthetic-private-password'));
  }
});
test('a connection that does not enter read-only mode still fails and rolls back',async()=>{
  const queries=[];let stage;const client={connection:{stream:{authorized:true}},connect:async()=>{},end:async()=>{},query:async sql=>{queries.push(sql);return {rows:[sql.startsWith('SELECT current_user')?{role:'recon_migrator',database:'postgres',version:'17.11',readonly:'off'}:{readonly:'off'}]};}};
  await assert.rejects(()=>verifyReadOnlyRoleLogin({user:'postgres.synthetic'},'recon_migrator','synthetic',value=>{stage=value.stage;},()=>client));
  assert.equal(stage,'explicit-read-only-transaction');assert.equal(queries.at(-1),'ROLLBACK');
});
function fixture(){const input={host:'aws-0-test.pooler.supabase.com',project:'abcdefghijklmnopqrst',user:'postgres.abcdefghijklmnopqrst',database:'postgres'};return {input,previous:{targetFingerprint:sha256([input.host,input.project,input.user,input.database].join('|'))},baseline:{migrationReadiness:'PRECHECKS_PASS_EXECUTION_NOT_AUTHORIZED'},security:{identity:[{current_role:'postgres',version:'17.11',read_only:'on',current_schema:'public'}],objects:[],roles:[{role:'postgres',rolcreaterole:true}],schemaPrivileges:[]}};}
test('read-only gate pins the previously verified exact production target and empty application state',()=>{const f=fixture();assert.doesNotThrow(()=>assertPreflight(f.baseline,f.security,f.input,f.previous));});
test('target drift, unexpected objects or roles, write sessions and missing provisioning rights stop the gate',()=>{
  const f=fixture();assert.throws(()=>assertPreflight(f.baseline,f.security,{...f.input,host:'other.pooler.supabase.com'},f.previous));
  for(const change of [{objects:[{name:'unexpected'}]},{roles:[...f.security.roles,{role:'recon_runtime'}]},{identity:[{...f.security.identity[0],read_only:'off'}]},{roles:[{role:'postgres',rolcreaterole:false}]},{schemaPrivileges:[{role:'anon',schema:'public',create:true}]}])assert.throws(()=>assertPreflight(f.baseline,{...f.security,...change},f.input,f.previous));
});
function executionFixture(){
  const tables=Object.fromEntries([['AdminUser',1],['SiteSetting',27],['Media',3]].map(([name,count])=>[name,Array.from({length:count},(_,i)=>({id:name+'-'+i,value:'synthetic-'+i}))]));
  const digest='synthetic-plan-digest';const plan={counts:{AdminUser:1,SiteSetting:27,Media:3},migrations:Array(12).fill({}),hardening:Array(3).fill({}),roles:['recon_migrator','recon_runtime'],payloadTablesSha256:sha256(JSON.stringify(tables))};
  const authorization={task:'LAUNCH-06',approvedPlanSha256:digest,explicitProductionWritesAuthorized:true,offsiteRetentionConfirmed:true,independentRecoveryVerified:true,dataApiOffConfirmed:true,roleLoginProvisioningAuthorized:true};
  return {plan,digest,authorization,payload:{tables}};
}
test('an explicit owner stop blocks reuse of an earlier authorization',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch06-stop-'));
  try{assert.doesNotThrow(()=>assertExecutionNotStopped(dir));fs.writeFileSync(path.join(dir,'owner-stopped-operation.json'),'{}');assert.throws(()=>assertExecutionNotStopped(dir));}finally{assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('recon-launch06-stop-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('runtime-only password writes require fresh approval and cannot include migrations or migrator changes',()=>{
  const valid={task:'LAUNCH-06',approvedPlanSha256:'1fd85b1571f607305cdbca13f743e264690ca851cade9099044af823df7918b9',explicitRuntimePasswordWriteAuthorized:true,role:'recon_runtime',preserveMigratorPassword:true,roleCreationAuthorized:false,migrationsAuthorized:false,importAuthorized:false,deploymentAuthorized:false,githubPushAuthorized:false};
  assert.doesNotThrow(()=>assertRuntimePasswordScope(valid));
  for(const key of ['roleCreationAuthorized','migrationsAuthorized','importAuthorized','deploymentAuthorized','githubPushAuthorized'])assert.throws(()=>assertRuntimePasswordScope({...valid,[key]:true}));
  assert.throws(()=>assertRuntimePasswordScope({...valid,role:'recon_migrator'}));assert.throws(()=>assertRuntimePasswordScope({...valid,preserveMigratorPassword:false}));assert.throws(()=>assertRuntimePasswordScope({...valid,explicitRuntimePasswordWriteAuthorized:false}));
  const root=path.resolve('.local/launch06'),dir=fs.mkdtempSync(path.join(root,'synthetic-runtime-approval-'));
  try{
    fs.writeFileSync(path.join(dir,'approval-plan.json'),'{}');
    assert.throws(()=>requireRuntimePasswordAuthorization(dir));
    // An arbitrary or stale plan cannot become authorized by creating a receipt.
    fs.writeFileSync(path.join(dir,'owner-runtime-password-only-authorization.json'),JSON.stringify({task:'LAUNCH-06',explicitRuntimePasswordWriteAuthorized:true,role:'recon_runtime',migrationsAuthorized:true}));
    assert.throws(()=>requireRuntimePasswordAuthorization(dir));
  }finally{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('synthetic-runtime-approval-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('password-only recovery holds broad execution and requires fresh inspection-bound approval',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch06-password-hold-'));
  try{fs.writeFileSync(path.join(dir,'password-setup-only-hold.json'),'{}');assert.throws(()=>assertExecutionNotStopped(dir));}
  finally{assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('recon-launch06-password-hold-'));fs.rmSync(dir,{recursive:true,force:true});}
  const state={roles:['recon_migrator','recon_runtime'].map(rolname=>({rolname,rolcanlogin:true,passwordSet:false})),publicObjects:0,migrationHistoryPresent:false};
  const auth={task:'LAUNCH-06',approvedPlanSha256:'1fd85b1571f607305cdbca13f743e264690ca851cade9099044af823df7918b9',explicitPasswordOnlyWritesAuthorized:true,inspectionSha256:'inspection',holdSha256:'hold',roles:['recon_migrator','recon_runtime'],migrationsAuthorized:false,importAuthorized:false};
  assert.deepEqual(requirePasswordOnlyAuthorization(auth,state,'inspection','hold'),auth.roles);
  assert.throws(()=>requirePasswordOnlyAuthorization({...auth,migrationsAuthorized:true},state,'inspection','hold'));
  assert.throws(()=>requirePasswordOnlyAuthorization(auth,state,'changed','hold'));
  assert.throws(()=>missingRolePasswords({...state,roles:[{...state.roles[0],passwordSet:null},state.roles[1]]}));
  assert.deepEqual(missingRolePasswords({...state,roles:[{...state.roles[0],passwordSet:true},state.roles[1]]}),['recon_runtime']);
});
test('only fresh plan-bound resume authorization can supersede a retained stop record',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch06-resume-'));
  try{
    const ctx=executionFixture(),plan=JSON.stringify(ctx.plan),stop=JSON.stringify({status:'STOPPED_BY_OWNER'});
    fs.writeFileSync(path.join(dir,'approval-plan.json'),plan);fs.writeFileSync(path.join(dir,'owner-stopped-operation.json'),stop);
    fs.writeFileSync(path.join(dir,'owner-write-authorization.json'),JSON.stringify({...ctx.authorization,approvedPlanSha256:sha256(plan)}));assert.throws(()=>assertExecutionNotStopped(dir));
    const resume={...ctx.authorization,approvedPlanSha256:sha256(plan),explicitResumeAuthorized:true,supersedesStopSha256:sha256(stop)};
    fs.writeFileSync(path.join(dir,'owner-resume-authorization.json'),JSON.stringify(resume));assert.doesNotThrow(()=>assertExecutionNotStopped(dir));
    fs.writeFileSync(path.join(dir,'owner-stopped-operation.json'),JSON.stringify({status:'NEW_STOP'}));assert.throws(()=>assertExecutionNotStopped(dir));
  }finally{assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('recon-launch06-resume-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('post-password continuation skips provisioning and requires verified passwords before migrations',()=>{
  const root=path.resolve('.local/launch06'),dir=fs.mkdtempSync(path.join(root,'synthetic-continuation-')),scoped=fs.mkdtempSync(path.join(root,'synthetic-approval-'));
  try{
    const ctx=executionFixture(),plan=JSON.stringify(ctx.plan),hold=JSON.stringify({stopped:true}),stop='{}';
    for(const [file,value] of [['approval-plan.json',plan],['password-setup-only-hold.json',hold],['owner-stopped-operation.json',stop]])fs.writeFileSync(path.join(dir,file),value);
    const auth={...ctx.authorization,approvedPlanSha256:sha256(plan),explicitResumeAuthorized:true,supersedesStopSha256:sha256(stop),explicitContinuationAuthorized:true,roleProvisioningCompleted:true,roleCreationAuthorized:false,holdSha256:sha256(hold),executionDirectory:dir,passwordAuthorizationSha256:'synthetic-password-authorization'};
    fs.writeFileSync(path.join(dir,'owner-post-password-continuation-authorization.json'),JSON.stringify(auth));
    assert.throws(()=>assertExecutionNotStopped(dir,'provision'));
    assert.throws(()=>assertExecutionNotStopped(dir,'migrate-import'));
    const receipt=JSON.stringify({status:'PASSWORD_SETUP_VERIFIED',readOnlyLoginVerified:true});
    fs.writeFileSync(path.join(dir,'password-setup-completed.json'),receipt);
    fs.writeFileSync(path.join(dir,'password-setup-verified.json'),JSON.stringify({directory:dir,completionSha256:sha256(receipt),authorizationSha256:auth.passwordAuthorizationSha256}));
    assert.doesNotThrow(()=>assertExecutionNotStopped(dir,'migrate-import'));
    const narrowedHold=JSON.stringify({stopped:true,executionDirectory:dir}),scopedFile=path.join(scoped,'owner-post-password-continuation-authorization.json');
    fs.writeFileSync(path.join(dir,'password-setup-only-hold.json'),narrowedHold);
    fs.writeFileSync(scopedFile,JSON.stringify({...auth,holdSha256:sha256(narrowedHold)}));
    fs.writeFileSync(path.join(dir,'password-setup-verified.json'),JSON.stringify({directory:dir,completionSha256:sha256(receipt),authorizationSha256:auth.passwordAuthorizationSha256,continuationAuthorizationFile:scopedFile}));
    assert.doesNotThrow(()=>assertExecutionNotStopped(dir,'migrate-import'));
    fs.writeFileSync(path.join(dir,'migrations-started.json'),'{}');assert.throws(()=>assertExecutionNotStopped(dir,'migrate-import'));
  }finally{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('synthetic-continuation-'));fs.rmSync(dir,{recursive:true,force:true});assert.equal(path.dirname(scoped),root);assert.ok(path.basename(scoped).startsWith('synthetic-approval-'));fs.rmSync(scoped,{recursive:true,force:true});}
});
test('stored local admin credential is verified without changing the hash or environment file; stale values fail closed',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'recon-launch06-local-credential-')),file=path.join(dir,'.env');
  try{
    const password=randomBytes(24).toString('base64url'),hash=await bcrypt.hash(password,4),admin={role:'SUPER_ADMIN',isActive:true,passwordHash:hash};
    fs.writeFileSync(file,'ADMIN_PASSWORD='+JSON.stringify(password)+'\n');const before=fs.readFileSync(file);
    assert.equal(await readVerifiedLocalAdminPassword(admin,file),password);assert.equal(admin.passwordHash,hash);assert.ok(fs.readFileSync(file).equals(before));
    const differentHash=await bcrypt.hash(randomBytes(24).toString('base64url'),4);await assert.rejects(()=>readVerifiedLocalAdminPassword({...admin,passwordHash:differentHash},file));
  }finally{assert.equal(path.dirname(dir),os.tmpdir());assert.ok(path.basename(dir).startsWith('recon-launch06-local-credential-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('production write gate requires explicit matching authorization and every prior owner gate',async()=>{
  const ctx=executionFixture();assert.doesNotThrow(()=>requireWriteAuthorization(ctx.plan,ctx.digest,ctx.authorization));
  for(const key of ['explicitProductionWritesAuthorized','offsiteRetentionConfirmed','independentRecoveryVerified','dataApiOffConfirmed','roleLoginProvisioningAuthorized'])assert.throws(()=>requireWriteAuthorization(ctx.plan,ctx.digest,{...ctx.authorization,[key]:false}));
  assert.throws(()=>requireWriteAuthorization(ctx.plan,'changed-plan',ctx.authorization));
  let queries=0;await assert.rejects(()=>importApprovedRows({query:async()=>{queries++;}},{...ctx,authorization:{}}));assert.equal(queries,0);
});
test('changing a sealed import or its exact row counts is rejected before any SQL',async()=>{
  const ctx=executionFixture();ctx.payload.tables.Media[0].value='changed';let queries=0;
  await assert.rejects(()=>importApprovedRows({query:async()=>{queries++;}},ctx));assert.equal(queries,0);
});
test('typed atomic import preserves exact rows, skips exact repeats and rolls back a late conflict',async()=>{
  const ctx=executionFixture();let store={AdminUser:[],SiteSetting:[],Media:[]},snapshot,insertCalls=0,rollbacks=0;
  const canonical=row=>JSON.stringify(row);
  const db={query:async(sql,params=[])=>{
    if(sql==='BEGIN READ WRITE'){snapshot=structuredClone(store);return {};}
    if(sql==='COMMIT')return {};
    if(sql==='ROLLBACK'){store=snapshot;rollbacks++;return {};}
    if(sql.includes('SET LOCAL')||sql.includes('pg_advisory'))return {};
    if(sql.includes('information_schema.columns'))return {rows:['id','value'].map(column_name=>({column_name}))};
    const table=sql.match(/public\."([A-Za-z]+)"/)?.[1];
    if(sql.startsWith('SELECT to_jsonb(r)'))return {rows:[{canonical:canonical(JSON.parse(params[0]))}]};
    if(sql.startsWith('SELECT to_jsonb(t)'))return {rows:store[table].filter(r=>!sql.includes('WHERE id')||r.id===params[0]).map(r=>({canonical:canonical(r)}))};
    if(sql.startsWith('INSERT INTO')){store[table].push(JSON.parse(params[0]));insertCalls++;return {};}
    if(sql.includes('pg_tables'))return {rows:['AdminUser','SiteSetting','Media','_prisma_migrations'].map(tablename=>({tablename}))};
    throw Error('Unexpected SQL in synthetic adapter');
  }};
  assert.equal((await importApprovedRows(db,ctx)).inserted,31);assert.equal((await importApprovedRows(db,ctx)).skipped,31);assert.equal(insertCalls,31);
  store={AdminUser:[],SiteSetting:[],Media:[{...ctx.payload.tables.Media[2],value:'conflict'}]};const before=structuredClone(store);
  await assert.rejects(()=>importApprovedRows(db,ctx));assert.deepEqual(store,before);assert.equal(rollbacks,1);
});
test('approved payload preserves the super-admin hash and existing IDs while mapping exactly three media records',()=>{
  const names=['websiteLogo','footerLogo','favicon'];
  const admins=[{id:'synthetic-admin',role:'SUPER_ADMIN',isActive:true,passwordHash:'$2b$10$'+'x'.repeat(53)}];
  const media=names.map((key,i)=>({id:'media-'+i,fileUrl:'/uploads/media/'+i+'.png',size:100+i,updatedAt:'synthetic'}));media.push({id:'historical',fileUrl:'/uploads/media/old.png'});
  const settings=names.map((key,i)=>({id:'setting-'+i,key,value:media[i].fileUrl,type:'IMAGE_URL'}));for(let i=3;i<27;i++)settings.push({id:'setting-'+i,key:'synthetic-'+i,value:'unchanged',type:'STRING'});
  const mapping={cloudName:'synthetic',mappings:media.slice(0,3).map((r,i)=>({mediaId:r.id,sourceUrl:r.fileUrl,targetUrl:`https://res.cloudinary.com/synthetic/image/upload/v1/approved-${i}.png`}))};
  const before=JSON.stringify({admins,settings,media}),payload=preparePayload(admins,settings,media,mapping);
  assert.equal(payload.AdminUser[0].passwordHash,admins[0].passwordHash);assert.equal(payload.SiteSetting.length,27);assert.equal(payload.Media.length,3);assert.ok(!payload.Media.some(r=>r.id==='historical'));
  assert.deepEqual(payload.Media.map(r=>r.id),media.slice(0,3).map(r=>r.id));assert.equal(JSON.stringify({admins,settings,media}),before);
  assert.throws(()=>preparePayload([{...admins[0],isActive:false}],settings,media,mapping));assert.throws(()=>preparePayload(admins,settings.slice(0,26),media,mapping));
});
