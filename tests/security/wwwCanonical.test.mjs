import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {createHarness} from './moduleHarness.mjs';
test('www origins cover metadata, car links, robots and legacy sitemap inputs',async()=>{
  const load=createHarness({[path.resolve('lib/prisma.ts')]:{prisma:{car:{findMany:async()=>[]},brand:{findMany:async()=>[]},vehicleCategory:{findMany:async()=>[{slug:'legacy',routePath:'https://reconimports.com/legacy',updatedAt:new Date(0)},{slug:'current',routePath:'https://www.reconimports.com/current',updatedAt:new Date(0)}]}}},[path.resolve('lib/generated/prisma/enums.ts')]:{CarSaleStatus:{SOLD:'SOLD'}}});
  const seo=await load('lib/seo.ts');assert.equal(seo.siteUrl,'https://www.reconimports.com');assert.equal(seo.absoluteUrl('/about-us'),'https://www.reconimports.com/about-us');
  const routes=await load('lib/carPublicRoutes.ts');assert.equal(routes.getCarPublicUrl({slug:'synthetic',stockType:'PRE_OWNED'}),'https://www.reconimports.com/pre-owned/synthetic');
  const robots=await load('app/robots.ts');assert.equal(robots.default().sitemap,'https://www.reconimports.com/sitemap.xml');
  const sitemap=await load('app/sitemap.ts');const entries=await sitemap.default();assert.ok(entries.every(entry=>entry.url.startsWith('https://www.reconimports.com/')));assert.ok(entries.some(entry=>entry.url==='https://www.reconimports.com/legacy'));assert.ok(entries.some(entry=>entry.url==='https://www.reconimports.com/current'));
});
