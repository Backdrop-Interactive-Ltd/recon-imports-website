import test from 'node:test';import assert from 'node:assert/strict';import {validateWorkerSecrets,initialWorkerUrl} from '../../scripts/workers-secret-prepare.mjs';
test('Worker secrets require exact names, expected product environment and initial auth origin',()=>{
  const values={AUTH_SECRET:'a'.repeat(64),AUTH_URL:initialWorkerUrl,CLOUDINARY_CLOUD_NAME:'synthetic',CLOUDINARY_API_KEY:'1234567890',CLOUDINARY_API_SECRET:'synthetic-private-value'};
  assert.doesNotThrow(()=>validateWorkerSecrets(values,'synthetic','synthetic'));
  for(const change of [{AUTH_URL:'https://external.invalid'},{AUTH_SECRET:'short'},{CLOUDINARY_CLOUD_NAME:'other'},{ADMIN_PASSWORD:'synthetic-private'}])assert.throws(()=>validateWorkerSecrets({...values,...change},'synthetic','synthetic'));
  assert.throws(()=>validateWorkerSecrets(values,'other','synthetic'));
});
