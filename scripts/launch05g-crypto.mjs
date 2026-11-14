import fs from 'node:fs';
import {randomBytes,scryptSync,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import assert from 'node:assert/strict';

const magic=Buffer.from('RECONPG1');const headerBytes=36;const tagBytes=16;
function key(password,salt){assert.ok(typeof password==='string'&&password.length>=16&&password.length<=1024);return scryptSync(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});}
function encoder(password){const header=Buffer.concat([magic,randomBytes(16),randomBytes(12)]),derived=key(password,header.subarray(8,24));try{const cipher=createCipheriv('aes-256-gcm',derived,header.subarray(24));cipher.setAAD(header);return {header,cipher};}finally{derived.fill(0);}}
function decoder(header,tag,password){assert.equal(header.length,headerBytes);assert.ok(header.subarray(0,8).equals(magic));const derived=key(password,header.subarray(8,24));try{const cipher=createDecipheriv('aes-256-gcm',derived,header.subarray(24));cipher.setAAD(header);cipher.setAuthTag(tag);return cipher;}finally{derived.fill(0);}}
export async function hashFile(file){const hash=createHash('sha256');for await(const data of fs.createReadStream(file))hash.update(data);return hash.digest('hex');}
export async function encryptFile(source,target,password){
  const {header,cipher}=encoder(password);fs.writeFileSync(target,header,{flag:'wx',mode:0o600});
  await pipeline(fs.createReadStream(source),cipher,fs.createWriteStream(target,{flags:'a'}));fs.appendFileSync(target,cipher.getAuthTag());
  return {bytes:fs.statSync(target).size,sha256:await hashFile(target)};
}
// Only returns after GCM authentication has succeeded. Callers MUST wait for
// this function before parsing an archive or executing restore SQL.
export async function decryptFile(source,target,password){
  const length=fs.statSync(source).size;assert.ok(length>=headerBytes+tagBytes);
  const fd=fs.openSync(source,'r'),header=Buffer.alloc(headerBytes),tag=Buffer.alloc(tagBytes);
  try{fs.readSync(fd,header,0,headerBytes,0);fs.readSync(fd,tag,0,tagBytes,length-tagBytes);}finally{fs.closeSync(fd);}
  const cipher=decoder(header,tag,password);let created=false;
  try{
    const out=fs.openSync(target,'wx',0o600);created=true;
    await pipeline(fs.createReadStream(source,{start:headerBytes,end:length-tagBytes-1}),cipher,fs.createWriteStream(target,{fd:out}));
    return {bytes:fs.statSync(target).size,sha256:await hashFile(target)};
  }catch(error){if(created)fs.unlinkSync(target);throw error;}
}
export function sealJson(value,file,password){const {header,cipher}=encoder(password),plain=Buffer.from(JSON.stringify(value));try{fs.writeFileSync(file,Buffer.concat([header,cipher.update(plain),cipher.final(),cipher.getAuthTag()]),{flag:'wx',mode:0o600});}finally{plain.fill(0);}}
export function openJson(file,password){assert.ok(fs.statSync(file).size<16*1024*1024);const data=fs.readFileSync(file);assert.ok(data.length>=headerBytes+tagBytes);const cipher=decoder(data.subarray(0,headerBytes),data.subarray(-tagBytes),password);const plain=Buffer.concat([cipher.update(data.subarray(headerBytes,-tagBytes)),cipher.final()]);try{return JSON.parse(plain.toString('utf8'));}finally{plain.fill(0);}}
