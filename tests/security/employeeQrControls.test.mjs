import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHarness } from './moduleHarness.mjs';

async function controlsFixture() {
  let cursor = 0, tree;
  const slots = [], effects = new Map(), queued = [], requests = [], responses = [], created = [], revoked = [], downloads = [];
  const hooks = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: (callback, deps) => { const i = cursor++, old = effects.get(i); if (!old || deps.some((d, n) => d !== old.deps[n])) queued.push(() => { old?.cleanup?.(); effects.set(i, { deps, cleanup: callback() }); }); },
  };
  const load = createHarness({ react: hooks, [path.resolve('app/admin/(dashboard)/employees/page.module.css')]: { default: {} } }, {
    fetch: async (url, options) => { requests.push({ url, options }); assert.ok(responses.length, 'No automatic or unexpected request'); const next = responses.shift(); return typeof next === 'function' ? next() : next; },
    URL: { createObjectURL: () => { const value = 'blob:synthetic-' + created.length; created.push(value); return value; }, revokeObjectURL: value => revoked.push(value) },
    document: { body: { appendChild: () => {} }, createElement: () => ({ href: '', download: '', click() { downloads.push({ href: this.href, filename: this.download }); }, remove() {} }) },
    navigator: { clipboard: { writeText: async () => {} } },
  });
  const { default: Controls } = await load('app/admin/(dashboard)/employees/EmployeeIdentityControls.tsx');
  let props = { employeeCode: 'RI-EMP-101', profileUrl: 'https://www.reconimports.com/team/RI-EMP-101', canExport: true };
  function render(update = {}) { props = { ...props, ...update }; cursor = 0; tree = Controls(props); while (queued.length) queued.shift()(); return tree; }
  function find(node, label) {
    if (!node) return null;
    if (Array.isArray(node)) { for (const n of node) { const value = find(n, label); if (value) return value; } return null; }
    if (node.type === 'button' && node.props.children === label) return node;
    return typeof node === 'object' ? find(node.props?.children, label) : null;
  }
  return { render, html: () => renderToStaticMarkup(tree), click: label => { const button = find(tree, label); assert.ok(button, label); return button.props.onClick(); }, requests, responses, created, revoked, downloads };
}

test('QR preview is on demand; download reauthorizes with a validator and reuses browser-local pixels', async () => {
  const f = await controlsFixture(); f.render(); assert.equal(f.requests.length, 0); assert.ok(!f.html().includes('<img'));
  f.responses.push(new Response('synthetic-png', { headers: { 'Content-Type': 'image/png', ETag: '"synthetic-etag"' } }));
  await f.click('Show QR Preview'); f.render(); assert.match(f.html(), /blob:synthetic-0/); assert.equal(f.requests.length, 1);
  f.responses.push(new Response(null, { status: 304 }));
  await f.click('Download QR Code (PNG)'); f.render();
  assert.equal(f.requests.length, 2); assert.equal(f.requests[1].options.headers['If-None-Match'], '"synthetic-etag"');
  assert.equal(f.requests[1].options.cache, 'no-store'); assert.equal(f.requests[1].options.credentials, 'same-origin');
  assert.equal(f.created.length, 1); assert.deepEqual(f.downloads, [{ href: 'blob:synthetic-0', filename: 'RI-EMP-101-qr.png' }]);
  f.responses.push(new Response(null, { status: 403 })); await f.click('Show QR Preview'); f.render();
  assert.ok(!f.html().includes('<img')); assert.ok(f.revoked.includes('blob:synthetic-0')); assert.match(f.html(), /may no longer have access/);
});

test('role changes remove preview bytes and never expose controls to unauthorized roles', async () => {
  const f = await controlsFixture(); f.render();
  f.responses.push(new Response('png', { headers: { 'Content-Type': 'image/png' } })); await f.click('Show QR Preview'); f.render();
  f.render({ canExport: false }); f.render();
  assert.ok(!f.html().includes('<img')); assert.ok(!f.html().includes('Show QR Preview')); assert.equal(f.revoked.length, 1);
});

test('late QR responses cannot attach to a different employee after navigation', async () => {
  const f = await controlsFixture(); f.render(); let complete;
  f.responses.push(() => new Promise(resolve => { complete = resolve; }));
  const pending = f.click('Show QR Preview');
  f.render({ employeeCode: 'RI-EMP-102', profileUrl: 'https://www.reconimports.com/team/RI-EMP-102' });
  complete(new Response('png', { headers: { 'Content-Type': 'image/png' } })); await pending; f.render();
  assert.equal(f.created.length, 0); assert.ok(!f.html().includes('<img'));
});

test('rapid repeated preview clicks issue only one in-flight request', async () => {
  const f = await controlsFixture(); f.render(); let complete;
  f.responses.push(() => new Promise(resolve => { complete = resolve; }));
  const first = f.click('Show QR Preview'); await f.click('Show QR Preview'); assert.equal(f.requests.length, 1);
  complete(new Response('png', { headers: { 'Content-Type': 'image/png' } })); await first;
});
