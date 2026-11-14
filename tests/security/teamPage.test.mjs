import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHarness } from './moduleHarness.mjs';

async function render({ members = [], fail = false, page = '1' } = {}) {
  const calls = [];
  const load = createHarness({
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) },
    'next/image': { default: ({ fill, unoptimized, ...props }) => React.createElement('img', props) },
    [path.resolve('app/components/Footer.tsx')]: { default: () => React.createElement('footer', null, 'Shared footer') },
    [path.resolve('app/components/PublicLogoImage.tsx')]: { default: () => React.createElement('span', null, 'RECON IMPORTS') },
    [path.resolve('lib/siteSettings.ts')]: { getSiteSettings: async () => ({ siteName: 'Recon Imports' }) },
    [path.resolve('lib/employees/publicQueries.ts')]: { getPublicTeamMembers: async input => { calls.push(input); if (fail) throw Error('PRIVATE_DATABASE_ERROR'); return members; } },
    [path.resolve('app/team/page.module.css')]: { default: {} },
  });
  const module = await load('app/team/page.tsx');
  const tree = await module.default({ searchParams: Promise.resolve({ page }) });
  return { html: renderToStaticMarkup(tree), calls, module };
}

test('team uses live public query, renders only card fields and links to permanent profile pages', async () => {
  const { html, calls, module } = await render({ members: [{ employeeCode: 'RI-EMP-999', publicName: 'Synthetic approved member', designation: 'Synthetic role', portrait: 'https://res.cloudinary.com/example/image/upload/photo.webp', officialEmail: 'PRIVATE_CONTACT', biography: 'PRIVATE_BIOGRAPHY' }] });
  assert.equal(module.dynamic, 'force-dynamic'); assert.equal(module.revalidate, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ page: 1, pageSize: 24 }]);
  assert.match(html, /DIFFERENT/); assert.match(html, /Synthetic approved member/); assert.match(html, /Synthetic role/);
  assert.match(html, /https:\/\/res.cloudinary.com\/example\/image\/upload\/photo.webp/);
  assert.ok(!html.includes('PRIVATE_CONTACT')); assert.ok(!html.includes('PRIVATE_BIOGRAPHY'));
  assert.ok(html.includes('/team/RI-EMP-999'));
});

test('team has honest empty/error states and never exposes errors or invents members', async () => {
  const empty = await render(); assert.match(empty.html, /Meet our people, soon/);
  const failed = await render({ fail: true }); assert.match(failed.html, /temporarily unavailable/);
  assert.ok(!failed.html.includes('PRIVATE_DATABASE_ERROR'));
});

test('team handles withheld portraits and validates pagination', async () => {
  const { html, calls } = await render({ page: '-10', members: [{ employeeCode: 'RI-EMP-999', publicName: 'Synthetic member', designation: 'Synthetic role', portrait: null }] });
  assert.equal(calls[0].page, 1); assert.match(html, /Synthetic member/);
  assert.ok(!html.includes('alt="Synthetic member, Synthetic role"'));
  const later = await render({ page: '2' }); assert.equal(later.calls[0].page, 2); assert.match(later.html, /Previous/);
});
