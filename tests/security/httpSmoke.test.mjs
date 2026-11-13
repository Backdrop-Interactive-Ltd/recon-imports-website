import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { encode } from 'next-auth/jwt';

const enabled = process.env.RUN_LOCAL_HTTP_TEST === '1';
const base = 'http://localhost:3000';

test('local HTTP: real credentials, dashboard/pages, DB-authoritative role, and invalid subject denial', { skip: !enabled }, async () => {
  const database = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1'].includes(database.hostname));
  assert.equal(database.port,'54329');
  assert.equal(database.pathname,'/recon_local');
  const cookies = new Map();
  function save(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0]; const index = pair.indexOf('=');
      cookies.set(pair.slice(0,index),pair.slice(index+1));
    }
  }
  const cookieHeader = () => [...cookies].map(([key,value]) => `${key}=${value}`).join('; ');
  const csrf = await fetch(`${base}/api/auth/csrf`); save(csrf);
  const { csrfToken } = await csrf.json();
  const login = await fetch(`${base}/api/auth/callback/credentials`, {
    method:'POST', redirect:'manual',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded', Cookie:cookieHeader(), 'X-Auth-Return-Redirect':'1' },
    body:new URLSearchParams({ csrfToken, email:process.env.ADMIN_EMAIL, password:process.env.ADMIN_PASSWORD, callbackUrl:`${base}/admin` }),
  });
  save(login);
  const session=await (await fetch(`${base}/api/auth/session`, { headers:{ Cookie:cookieHeader() } })).json();
  assert.ok(session?.user?.id, 'Local seeded admin must authenticate');
  assert.equal(session.user.role,'SUPER_ADMIN','This read-only smoke test needs the existing local seeded super admin');
  for (const route of ['/admin','/admin/users','/admin/cars','/admin/cars/list','/admin/media','/admin/site-settings','/admin/brands','/admin/categories','/admin/homepage','/admin/newsletter','/admin/sell-car-leads','/admin/requirement-leads','/admin/auction-sheet-requests']) {
    const response=await fetch(`${base}${route}`,{ headers:{Cookie:cookieHeader()},redirect:'manual' });
    assert.equal(response.status,200,route);
  }
  const cookieName=[...cookies.keys()].find(name => name.endsWith('authjs.session-token'));
  assert.ok(cookieName);
  const secret=process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const lowerClaim=await encode({ token:{ sub:session.user.id,role:'EDITOR' },secret,salt:cookieName });
  const currentRoleResponse=await fetch(`${base}/admin/users`,{ headers:{Cookie:`${cookieName}=${lowerClaim}`},redirect:'manual' });
  assert.equal(currentRoleResponse.status,200,'Current DB SUPER_ADMIN overrides a lower JWT role');
  const missingSubject=await encode({ token:{ sub:'security-test-nonexistent-account',role:'SUPER_ADMIN' },secret,salt:cookieName });
  for (const cookie of ['',`${cookieName}=${missingSubject}`]) {
    const denied=await fetch(`${base}/admin`,{ headers:{Cookie:cookie},redirect:'manual' });
    assert.ok([302,303,307,308].includes(denied.status));
    assert.equal(new URL(denied.headers.get('location'),base).pathname,'/admin/login');
    const upload=await fetch(`${base}/api/admin/uploads`,{ method:'POST',headers:{Cookie:cookie} });
    assert.equal(upload.status,401);
  }
  console.log('HTTP smoke: real login, 13 protected pages, authoritative DB role and invalid-subject/anonymous rejection passed. No records changed.');
});
