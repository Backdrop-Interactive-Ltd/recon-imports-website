import test from 'node:test';import assert from 'node:assert/strict';import {requireDeploymentAuthorization,containsBrandingAsset} from '../../scripts/workers-initial-deploy.mjs';import {initialWorkerUrl} from '../../scripts/workers-secret-prepare.mjs';
test('branding checks accept encoded image paths without decoding literal HTML percent signs',()=>{assert.equal(containsBrandingAsset('Save 20% <img src="folder%2Fverified-image">','folder/verified-image'),true);assert.equal(containsBrandingAsset('other-image','folder/verified-image'),false);});
test('initial deployment requires exact approval, fixed resources and no DNS/push/database permissions',()=>{
  const plan={worker:'recon-imports-website',initialUrl:initialWorkerUrl,hyperdriveId:'02364ff5b23e47a8889958733e06d1da',r2Bucket:'recon-imports-next-cache'};
  const approval={task:'WORKERS-INITIAL',planSha256:'synthetic',createWorker:true,deployWorker:true,attachSecrets:true,initializeConfiguredBindings:true,publishWorkersDev:true,push:false,changeDns:false,databaseWrites:false};
  assert.doesNotThrow(()=>requireDeploymentAuthorization(plan,'synthetic',approval));
  for(const key of ['createWorker','deployWorker','attachSecrets','initializeConfiguredBindings','publishWorkersDev'])assert.throws(()=>requireDeploymentAuthorization(plan,'synthetic',{...approval,[key]:false}));
  for(const key of ['push','changeDns','databaseWrites'])assert.throws(()=>requireDeploymentAuthorization(plan,'synthetic',{...approval,[key]:true}));
  assert.throws(()=>requireDeploymentAuthorization(plan,'changed',approval));assert.throws(()=>requireDeploymentAuthorization({...plan,hyperdriveId:'other'},'synthetic',approval));
});
