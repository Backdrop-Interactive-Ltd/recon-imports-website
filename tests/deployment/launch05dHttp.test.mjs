import test from 'node:test';
import assert from 'node:assert/strict';
import {encode} from 'next-auth/jwt';
import {connection} from './launch05dContext.mjs';

test('production NextAuth login/session/logout and protected pages work through the restricted database role',async()=>{
  const owner=await connection();const base=process.env.LAUNCH05D_HTTP_BASE;const u=new URL(base);assert.equal(u.hostname,'localhost');assert.notEqual(u.port,'3000');
  const cookies=new Map();const save=r=>{for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}};
  const header=()=>[...cookies].map(([k,v])=>`${k}=${v}`).join('; ');
  try {
    const csrf=await fetch(base+'/api/auth/csrf');save(csrf);const {csrfToken}=await csrf.json();
    const login=await fetch(base+'/api/auth/callback/credentials',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:header(),'X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD,callbackUrl:base+'/admin'})});save(login);
    const session=await (await fetch(base+'/api/auth/session',{headers:{Cookie:header()}})).json();assert.equal(session.user.id,'launch05d-http-admin');assert.equal(session.user.role,'SUPER_ADMIN');
    for(const route of ['/admin','/admin/users','/admin/cars','/admin/media','/admin/site-settings','/admin/brands','/admin/categories','/admin/homepage','/admin/newsletter','/admin/sell-car-leads','/admin/requirement-leads','/admin/auction-sheet-requests','/','/about-us','/brand-new','/pre-owned','/reconditioned']) {
      assert.equal((await fetch(base+route,{headers:{Cookie:header()},redirect:'manual'})).status,200,route);
    }
    const name=[...cookies.keys()].find(n=>n.endsWith('authjs.session-token'));assert.ok(name);
    const lower=await encode({token:{sub:session.user.id,role:'EDITOR'},secret:process.env.AUTH_SECRET,salt:name});assert.equal((await fetch(base+'/admin/users',{headers:{Cookie:`${name}=${lower}`},redirect:'manual'})).status,200);
    await owner.query('UPDATE "AdminUser" SET "isActive"=false WHERE id=$1',[session.user.id]);
    const stale=await fetch(base+'/admin',{headers:{Cookie:header()},redirect:'manual'});assert.ok([302,303,307,308].includes(stale.status));
    assert.equal((await fetch(base+'/api/admin/uploads',{method:'POST',headers:{Cookie:header()}})).status,401);
    await owner.query('UPDATE "AdminUser" SET "isActive"=true WHERE id=$1',[session.user.id]);
    const logoutCsrf=await fetch(base+'/api/auth/csrf',{headers:{Cookie:header()}});save(logoutCsrf);const logoutToken=(await logoutCsrf.json()).csrfToken;
    const logout=await fetch(base+'/api/auth/signout',{method:'POST',redirect:'manual',headers:{Cookie:header(),'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken:logoutToken,callbackUrl:base+'/admin/login'})});save(logout);
    const after=await (await fetch(base+'/api/auth/session',{headers:{Cookie:header()}})).json();assert.ok(!after?.user?.id);
  }finally{await owner.query('UPDATE "AdminUser" SET "isActive"=true WHERE id=$1',['launch05d-http-admin']);await owner.end();}
});
