import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHarness } from '../security/moduleHarness.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { fallbackSiteSettings } = require('../../lib/siteSettingsConfig.ts');

function hooks() {
  const values = []; let index = 0;
  return { reset() { index = 0; }, react: {
    useActionState: () => [{ status: 'idle', message: '' }, () => {}, false],
    useState(initial) { const key = index++; if (!(key in values)) values[key] = initial; return [values[key], next => { values[key] = typeof next === 'function' ? next(values[key]) : next; }]; },
    useRef(initial) { const key = index++; if (!(key in values)) values[key] = { current: initial }; return values[key]; },
    useEffect() {}, useId: () => 'synthetic-upload',
  } };
}
function nodes(element) {
  if (Array.isArray(element)) return element.flatMap(nodes);
  if (!element || typeof element !== 'object') return [];
  return [element, ...nodes(element.props?.children)];
}

test('settings form blocks submit synchronously during any image upload, including before rerender', async () => {
  const h = hooks(); const ImageUpload = () => null;
  const load = createHarness({
    react: h.react,
    [path.resolve('app/admin/(dashboard)/_components/AdminImageUpload.tsx')]: { default: ImageUpload },
    [path.resolve('app/admin/(dashboard)/site-settings/actions.ts')]: { updateSiteSettingsAction() {} },
    [path.resolve('app/admin/(dashboard)/site-settings/page.module.css')]: { default: {} },
  });
  const { default: Form } = await load('app/admin/(dashboard)/site-settings/SiteSettingsForm.tsx');
  const first = Form({ settings: fallbackSiteSettings });
  const uploads = nodes(first).filter(node => node.type === ImageUpload);
  uploads[0].props.onUploadStateChange(true); uploads[1].props.onUploadStateChange(true);
  let blocked = false; first.props.onSubmit({ preventDefault() { blocked = true; } }); assert.equal(blocked, true);
  h.reset(); const during = Form({ settings: fallbackSiteSettings });
  assert.equal(nodes(during).find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  uploads[0].props.onUploadStateChange(false);
  blocked = false; first.props.onSubmit({ preventDefault() { blocked = true; } }); assert.equal(blocked, true);
  uploads[1].props.onUploadStateChange(false);
  h.reset(); const after = Form({ settings: fallbackSiteSettings });
  assert.equal(nodes(after).find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, false);
});

test('actual upload component keeps the form blocked until upload resolves and updates the URL', async () => {
  const h = hooks(); let release; const events = [];
  const response = new Promise(resolve => { release = resolve; });
  const load = createHarness({ react: h.react, [path.resolve('app/admin/(dashboard)/_components/AdminImageUpload.module.css')]: { default: {} } }, { fetch: () => response });
  const { default: Upload } = await load('app/admin/(dashboard)/_components/AdminImageUpload.tsx');
  const element = Upload({ folder: 'media', label: 'Logo', name: 'websiteLogo', value: '', onChange: value => events.push(value), onUploadStateChange: value => events.push(value) });
  const file = nodes(element).find(node => node.type === 'input' && node.props.type === 'file');
  const pending = file.props.onChange({ target: { files: [new File(['synthetic'], 'test.png', { type: 'image/png' })] } });
  assert.deepEqual(events, [true]);
  release(Response.json({ url: '/uploads/media/synthetic.png' })); await pending;
  assert.deepEqual(events, [true, '/uploads/media/synthetic.png', false]);
});

test('failed admin settings load renders an alert with no editable form, while public fallback remains available', async () => {
  const load = createHarness({
    [path.resolve('lib/prisma.ts')]: { prisma: { siteSetting: { findMany: async () => { throw Error('synthetic outage'); } } } },
    [path.resolve('lib/adminAuthorization.ts')]: { requireAdminPagePermission: async () => ({ id: 'synthetic' }) },
    [path.resolve('app/admin/(dashboard)/site-settings/SiteSettingsForm.tsx')]: { default: () => null },
    [path.resolve('app/admin/(dashboard)/site-settings/page.module.css')]: { default: {} },
  }, { console: { ...console, error() {} } });
  const settings = await load('lib/siteSettings.ts');
  await assert.rejects(settings.getAdminSiteSettings(), /Saved settings could not be loaded/);
  assert.equal((await settings.getSiteSettings()).websiteLogo, fallbackSiteSettings.websiteLogo);
  const { default: Page } = await load('app/admin/(dashboard)/site-settings/page.tsx');
  const tree = await Page(); assert.equal(tree.props.role, 'alert');
  assert.ok(!nodes(tree).some(node => node.type === 'form' || node.type === 'input'));
});

test('transaction failure reports an unconfirmed save without leaking database details', async () => {
  const load = createHarness({
    [path.resolve('lib/adminAuthorization.ts')]: { requireAdminPermission: async () => ({ id: 'synthetic' }) },
    [path.resolve('lib/prisma.ts')]: { prisma: { siteSetting: { upsert: value => value }, $transaction: async () => { throw Error('sensitive database details'); } } },
    'next/cache': { revalidatePath() { throw Error('must not revalidate a failed save'); } },
  });
  const actions = await load('app/admin/(dashboard)/site-settings/actions.ts');
  const form = new FormData(); for (const [key, value] of Object.entries(fallbackSiteSettings)) form.set(key, value);
  const result = await actions.updateSiteSettingsAction({ status: 'idle', message: '' }, form);
  assert.equal(result.status, 'error'); assert.match(result.message, /reload saved settings/);
  assert.doesNotMatch(result.message, /sensitive database details/);
});
