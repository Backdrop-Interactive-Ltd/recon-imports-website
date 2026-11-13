import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { createHarness } from './moduleHarness.mjs';

const baseUrl = 'https://reconimports.com';
test('admin redirect preserves legitimate same-origin routes and rejects unsafe destinations', async () => {
  const load = createHarness(); const { getSafeAdminRedirect: redirect } = await load('lib/adminRedirect.ts');
  for (const url of ['/admin', '/admin/cars?search=Toyota#inventory', baseUrl + '/admin/site-settings', 'https://RECONIMPORTS.COM:443/admin/cars']) {
    assert.equal(redirect({ baseUrl, url }), new URL(url, baseUrl).href, url);
  }
  for (const url of [
    'https://reconimports.com.attacker.invalid/admin', 'https://reconimports.com@attacker.invalid/admin',
    'https://attacker.invalid/admin', 'http://reconimports.com/admin', 'https://reconimports.com:444/admin',
    '//attacker.invalid/admin', '//reconimports.com/admin', '/\\attacker.invalid/admin',
    '/admin/../../outside', '/administrator', '/admin/login', '/admin/login/reset',
    baseUrl + '/admin/login?callbackUrl=/admin', '/stock-list.pdf',
    'https://user:password@reconimports.com/admin', 'javascript:alert(1)', 'https://[malformed/admin',
    '', 'not a URL', '/admin\n/cars', ' https://reconimports.com/admin',
  ]) assert.equal(redirect({ baseUrl, url }), baseUrl + '/admin', JSON.stringify(url));
  assert.equal(redirect({ baseUrl: 'http://localhost:3000', url: '/admin/cars' }), 'http://localhost:3000/admin/cars');
  assert.equal(redirect({ baseUrl: 'http://localhost:3000', url: 'https://localhost:3000/admin/cars' }), 'http://localhost:3000/admin');
  for (const base of ['invalid', 'javascript:alert(1)', 'https://user:password@example.invalid']) assert.equal(redirect({ baseUrl: base, url: '/admin/cars' }), '/admin');
});

test('the actual NextAuth configuration uses exact-origin redirect validation', async () => {
  let config;
  let account;
  const load = createHarness({
    'next-auth': { default: value => { config = value; return { handlers: {}, auth() {}, signIn() {}, signOut() {} }; } },
    'next-auth/providers/credentials': { default: value => value },
    '@auth/prisma-adapter': { PrismaAdapter: () => ({}) },
    [path.resolve('lib/prisma.ts')]: { prisma: { adminUser: { findUnique: async () => account } } },
  });
  await load('lib/auth.ts');
  assert.equal(config.callbacks.redirect({ baseUrl, url: baseUrl + '.attacker.invalid/admin' }), baseUrl + '/admin');
  assert.equal(config.callbacks.redirect({ baseUrl, url: '/admin/cars' }), baseUrl + '/admin/cars');
  assert.equal(config.session.strategy, 'jwt');
  account = { id: 'synthetic-admin', name: 'Synthetic Admin', email: 'synthetic@example.invalid', role: 'SUPER_ADMIN', isActive: true, passwordHash: await bcrypt.hash('synthetic-test-password', 4) };
  const authorize = config.providers[0].authorize;
  const credentials = { email: account.email, password: 'synthetic-test-password' };
  const user = await authorize(credentials);
  assert.equal(user.id, account.id); assert.equal(user.role, 'SUPER_ADMIN');
  assert.ok(!('passwordHash' in user));
  assert.equal(await authorize({ ...credentials, password: 'incorrect' }), null);
  account.isActive = false; assert.equal(await authorize(credentials), null);
  account.isActive = true; account.role = 'UNRECOGNIZED'; assert.equal(await authorize(credentials), null);
  const token = config.callbacks.jwt({ token: { sub: user.id }, user });
  const session = config.callbacks.session({ session: { user: {} }, token });
  assert.equal(session.user.id, user.id); assert.equal(session.user.role, 'SUPER_ADMIN');
});
