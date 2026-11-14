import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { NextResponse } from 'next/server.js';
import { createHarness } from './moduleHarness.mjs';

const expectedUrl = 'https://www.reconimports.com/team/RI-EMP-101';
test('QR PNG independently decodes to permanent production URL with high contrast and quiet border', async () => {
  const load = createHarness(); const qr = await load('lib/employees/qr.ts');
  const png = await qr.generateEmployeeQr('RI-EMP-101');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(info.width >= 400); assert.equal(info.width, info.height);
  assert.deepEqual([...data.subarray(0, 4)], [255, 255, 255, 255]);
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.equal(decoded?.data, expectedUrl);
  await assert.rejects(qr.generateEmployeeQr('../wrong'));
});

async function route({ forbidden = false, exists = true, erased = false } = {}) {
  class AuthError extends Error { constructor(code) { super(code); this.code = code; } }
  let reads = 0;
  const load = createHarness({
    [path.resolve('lib/adminAuthorization.ts')]: { AdminAuthorizationError: AuthError, requireAdminPermission: async p => { assert.equal(p, 'employees.qr.export'); if (forbidden) throw new AuthError('FORBIDDEN'); } },
    [path.resolve('lib/employees/adminQueries.ts')]: { getEmployeeByCode: async () => { reads++; return exists ? { employeeCode: 'RI-EMP-101', employmentStatus: 'RESIGNED', personalDataErasedAt: erased ? new Date() : null } : null; } },
    'next/server': { NextResponse },
  }, { Response, Request, Headers, Uint8Array });
  return { module: await load('app/api/admin/employees/[employeeCode]/qr/route.ts'), reads: () => reads };
}

test('protected download returns PNG for unpublished/resigned employee without depending on publication', async () => {
  const f = await route();
  const response = await f.module.GET(new Request('http://localhost:3000/api/admin/employees/RI-EMP-101/qr?download=1'), { params: Promise.resolve({ employeeCode: 'RI-EMP-101' }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
  assert.match(response.headers.get('content-disposition'), /^attachment; filename="RI-EMP-101-qr.png"$/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, expectedUrl);
});

test('QR route denies unauthorized users before employee lookup; unknown and erased employees return 404', async () => {
  const denied = await route({ forbidden: true });
  const invoke = f => f.module.GET(new Request('http://localhost:3000/api/admin/employees/RI-EMP-101/qr'), { params: Promise.resolve({ employeeCode: 'RI-EMP-101' }) });
  assert.equal((await invoke(denied)).status, 403); assert.equal(denied.reads(), 0);
  assert.equal((await invoke(await route({ exists: false }))).status, 404);
  assert.equal((await invoke(await route({ erased: true }))).status, 404);
});

async function render(result, fail = false) {
  const load = createHarness({
    'next/link': { default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) },
    'next/image': { default: ({ fill, priority, unoptimized, ...props }) => React.createElement('img', props) },
    [path.resolve('app/components/Footer.tsx')]: { default: () => React.createElement('footer') },
    [path.resolve('app/components/PublicLogoImage.tsx')]: { default: () => React.createElement('span', null, 'RECON') },
    [path.resolve('lib/siteSettings.ts')]: { getSiteSettings: async () => ({ siteName: 'Recon Imports' }), getPhoneHref: s => 'tel:' + s },
    [path.resolve('lib/employees/publicQueries.ts')]: { getPublicEmployeeProfile: async code => { assert.equal(code, 'RI-EMP-101'); if (fail) throw Error('PRIVATE_ERROR'); return result; } },
    [path.resolve('app/team/page.module.css')]: { default: {} },
    [path.resolve('app/team/[employeeCode]/page.module.css')]: { default: {} },
  });
  const page = await load('app/team/[employeeCode]/page.tsx');
  assert.equal(page.dynamic, 'force-dynamic'); assert.equal(page.revalidate, 0);
  return renderToStaticMarkup(await page.default({ params: Promise.resolve({ employeeCode: 'RI-EMP-101' }) }));
}

test('public profile shows only eligible projection; withheld contacts and photo remain absent', async () => {
  const p = { employeeCode: 'RI-EMP-101', publicName: 'Synthetic member', designation: 'Synthetic role', experienceSummary: 'Synthetic experience', biography: 'Synthetic about', portrait: null, officialPhone: null, officialEmail: null };
  const html = await render({ state: 'ACTIVE', profile: p });
  for (const value of ['Synthetic member', 'Synthetic role', 'Synthetic experience', 'Synthetic about', 'RI-EMP-101', 'Back to Our Team']) assert.ok(html.includes(value));
  assert.ok(!html.includes('mailto:')); assert.ok(!html.includes('tel:'));
  const visible = await render({ state: 'ACTIVE', profile: { ...p, portrait: 'https://res.cloudinary.com/example/photo.webp', officialPhone: '+880123', officialEmail: 'synthetic@example.invalid' } });
  assert.match(visible, /mailto:synthetic@example.invalid/); assert.match(visible, /tel:\+880123/); assert.match(visible, /res.cloudinary.com/);
});

test('unpublished, resigned, unknown and outage pages expose no private profile fields', async () => {
  for (const state of ['UNAVAILABLE', 'RESIGNED', 'NOT_FOUND']) {
    const html = await render({ state, profile: { publicName: 'PRIVATE_NAME', officialEmail: 'PRIVATE_EMAIL', portrait: 'PRIVATE_PHOTO' } });
    assert.match(html, /Profile unavailable/); assert.ok(!html.includes('PRIVATE_')); assert.ok(!html.includes('EMPLOYEE ID /'));
  }
  const html = await render(null, true); assert.match(html, /try again shortly/); assert.ok(!html.includes('PRIVATE_ERROR'));
});

test('Admin identity controls copy the production link and expose authorized PNG preview/download only', async () => {
  let copied = null;
  const load = createHarness({
    react: { useState: () => ['', () => {}] },
    [path.resolve('app/admin/(dashboard)/employees/page.module.css')]: { default: {} },
  }, { navigator: { clipboard: { writeText: async value => { copied = value; } } } });
  const { default: Controls } = await load('app/admin/(dashboard)/employees/EmployeeIdentityControls.tsx');
  const props = { employeeCode: 'RI-EMP-101', profileUrl: expectedUrl, canExport: true };
  const tree = Controls(props);
  const children = React.Children.toArray(tree.props.children);
  await children.find(child => child.type === 'button').props.onClick();
  assert.equal(copied, expectedUrl);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /\/api\/admin\/employees\/RI-EMP-101\/qr\?download=1/);
  assert.match(html, /download="RI-EMP-101-qr.png"/);
  assert.match(html, /Permanent profile QR code for RI-EMP-101/);
  const restricted = renderToStaticMarkup(Controls({ ...props, canExport: false }));
  assert.ok(!restricted.includes('<img')); assert.ok(!restricted.includes('download='));
});
