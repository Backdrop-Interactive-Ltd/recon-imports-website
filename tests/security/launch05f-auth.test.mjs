import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCloudinaryAuthentication} from '../../scripts/launch05f-auth.mjs';

const fixture=()=>({cloudName:'synthetic-cloud',confirmCloudName:'synthetic-cloud',apiKey:'123456789',apiSecret:'rotated-synthetic-secret',newlyRotated:true});
const marker='PROVIDER-ERROR-MUST-NOT-LEAK';
test('success performs exactly one authenticated GET /ping and stops with no credential values in its result',async()=>{
  const input=fixture(),original={...input},requests=[];
  const result=await verifyCloudinaryAuthentication(input,{fetchImpl:async(url,options)=>{
    requests.push({url,options});assert.equal(url,'https://api.cloudinary.com/v1_1/synthetic-cloud/ping');
    assert.equal(options.method,'GET');assert.equal(options.body,undefined);assert.equal(options.redirect,'error');assert.ok(options.signal);
    assert.equal(options.headers.Authorization,'Basic '+Buffer.from(original.apiKey+':'+original.apiSecret).toString('base64'));
    return Response.json({status:'ok',api_key:original.apiKey,untrusted:marker});
  }});
  assert.equal(requests.length,1);assert.equal(result.status,'AUTH_VERIFIED');assert.equal(result.credentialPairVerified,true);
  assert.equal(result.assetRequests,0);assert.equal(result.databaseConnections,0);assert.equal(result.automaticRetries,0);
  for(const value of [original.apiKey,original.apiSecret,original.cloudName,marker,requests[0].options.headers.Authorization])assert.ok(!JSON.stringify(result).includes(value));
  for(const key of ['apiKey','apiSecret','cloudName','confirmCloudName'])assert.equal(input[key],'');
});
test('401 reports only sanitized operation/status and never reads the error body or retries',async()=>{
  let calls=0,reads=0,cancelled=0;
  const result=await verifyCloudinaryAuthentication(fixture(),{fetchImpl:async()=>{
    calls++;return {status:401,headers:new Headers(),body:{cancel:async()=>{cancelled++;}},json(){reads++;throw Error(marker);},text(){reads++;throw Error(marker);}};
  }});
  assert.equal(calls,1);assert.equal(reads,0);assert.equal(cancelled,1);assert.equal(result.code,'API_HTTP_401');
  assert.equal(result.credentialPairVerified,false);assert.equal(result.operation,'CLOUDINARY_ADMIN_PING');assert.equal(result.assetRequests,0);
  assert.ok(!JSON.stringify(result).includes(marker));
});
test('confirmation mismatch has an explicit safe code and makes no request',async()=>{
  let calls=0;const input={...fixture(),confirmCloudName:'incorrect'};
  const result=await verifyCloudinaryAuthentication(input,{fetchImpl:async()=>{calls++;throw Error(marker);}});
  assert.equal(calls,0);assert.equal(result.code,'CLOUD_NAME_CONFIRMATION_MISMATCH');assert.equal(result.requestAttempts,0);
  assert.equal(input.apiKey,'');assert.equal(input.apiSecret,'');
});
test('invalid input and unsafe target names are rejected before any API operation',async()=>{
  for(const change of [{cloudName:'https://evil.invalid'},{cloudName:'cloud/name'},{apiKey:'not-a-key'},{apiSecret:' secret-with-spaces '},{apiSecret:'bad\r\nvalue'},{newlyRotated:false}]){
    let calls=0;const result=await verifyCloudinaryAuthentication({...fixture(),...change},{fetchImpl:async()=>{calls++;}});
    assert.equal(result.status,'INPUT_REJECTED');assert.equal(calls,0);assert.equal(result.assetRequests,0);
  }
});
test('redirects and all non-success statuses stop after one GET without following another endpoint',async()=>{
  for(const status of [301,302,403,404,420,429,500]){
    let calls=0;const result=await verifyCloudinaryAuthentication(fixture(),{fetchImpl:async(url,options)=>{calls++;assert.equal(options.redirect,'error');return new Response(marker,{status,headers:{location:'https://evil.invalid/'}});}});
    assert.equal(calls,1);assert.equal(result.code,`API_HTTP_${status}`);assert.equal(result.status,'AUTH_FAILED');
  }
});
test('transport errors cannot leak secret-bearing exceptions and do not trigger automatic retries',async()=>{
  let calls=0;const result=await verifyCloudinaryAuthentication(fixture(),{fetchImpl:async()=>{calls++;throw Error(marker);}});
  assert.equal(calls,1);assert.equal(result.code,'AUTH_REQUEST_FAILED');assert.ok(!JSON.stringify(result).includes(marker));
});
test('HTTP 200 requires valid bounded ping JSON with status ok',async()=>{
  for(const response of [new Response(marker),Response.json({status:'not-ok',message:marker}),new Response(marker,{headers:{'content-length':'999999'}}),new Response('x'.repeat(17000))]){
    const result=await verifyCloudinaryAuthentication(fixture(),{fetchImpl:async()=>response});
    assert.equal(result.status,'AUTH_FAILED');assert.ok(!JSON.stringify(result).includes(marker));
  }
});
test('disabled TLS verification is rejected before contacting Cloudinary',async()=>{
  const prior=process.env.NODE_TLS_REJECT_UNAUTHORIZED;let calls=0;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
    const result=await verifyCloudinaryAuthentication(fixture(),{fetchImpl:async()=>{calls++;}});
    assert.equal(calls,0);assert.equal(result.code,'TLS_VERIFICATION_REQUIRED');
  }finally{if(prior===undefined)delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;else process.env.NODE_TLS_REJECT_UNAUTHORIZED=prior;}
});
