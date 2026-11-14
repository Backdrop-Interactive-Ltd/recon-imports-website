import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import sharp from 'sharp';
import { createHarness } from './moduleHarness.mjs';

async function setup(config = true, images = undefined) {
  const calls = [];
  const load = createHarness({
    [path.resolve('lib/runtime/cloudflare.ts')]: { getWorkersImagesBinding: () => { if (images === null) throw Error('PHOTO_IMAGES_UNAVAILABLE'); return images; } },
    [path.resolve('lib/uploads/cloudinary.ts')]: {
      getCloudinaryConfig: () => config ? {} : null,
      uploadImageBuffer: async (buffer, folder) => {
        calls.push({ buffer, folder });
        return { secure_url: 'https://res.cloudinary.com/example/image/upload/v123/photo.webp', version: 123 };
      },
    },
  }, { Blob });
  return { module: await load('lib/employees/photoUpload.ts'), calls };
}

test('photo upload accepts raster formats, re-encodes metadata-free and scopes each asset to its employee', async () => {
  const { module, calls } = await setup();
  for (const [format, type, ext] of [['jpeg', 'image/jpeg', 'jpg'], ['png', 'image/png', 'png'], ['webp', 'image/webp', 'webp']]) {
    const bytes = await sharp({ create: { width: 8, height: 6, channels: 4, background: '#ff000080' } })[format]().toBuffer();
    const result = await module.prepareEmployeePhoto(new File([bytes], `portrait.${ext}`, { type }), 'employee-101');
    assert.equal(result.version, '123');
    assert.equal(calls.at(-1).folder, 'employees/employee-101');
    const metadata = await sharp(calls.at(-1).buffer).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.width, 8);
  }
});

test('missing Cloudinary never falls back to local storage', async () => {
  const { module, calls } = await setup(false);
  await assert.rejects(module.prepareEmployeePhoto(new File(['x'], 'x.png', { type: 'image/png' }), 'employee'), /PHOTO_CLOUDINARY_UNAVAILABLE/);
  assert.equal(calls.length, 0);
});

test('invalid types, oversized content, spoofed image bytes and invalid employee IDs never upload', async () => {
  const { module, calls } = await setup();
  for (const file of [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), new File([Buffer.alloc(3 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' }), new File(['not an image'], 'x.png', { type: 'image/png' })]) {
    await assert.rejects(module.prepareEmployeePhoto(file, 'employee'));
  }
  await assert.rejects(module.prepareEmployeePhoto(new File(['x'], 'x.png', { type: 'image/png' }), '../other'));
  assert.equal(calls.length, 0);
});

test('draft action requires upload consent and both permissions before upload; preserves server-owned reference', async () => {
  const calls = [];
  class DomainError extends Error { constructor(code) { super(code); this.code = code; } }
  const load = createHarness({
    'next/cache': { revalidatePath: () => {} },
    [path.resolve('lib/adminAuthorization.ts')]: { requireAdminPermission: async p => calls.push(p), AdminAuthorizationError: class extends Error {} },
    [path.resolve('lib/employees/photoUpload.ts')]: { prepareEmployeePhoto: async () => { calls.push('upload'); return { url: 'https://res.cloudinary.com/example/image/upload/photo.webp', version: '1' }; } },
    [path.resolve('lib/employees/services.ts')]: Object.fromEntries([
      ['EmployeeDomainError', DomainError],
      ['checkEmployeePhotoDraft', async () => calls.push('check')],
      ['saveEmployeeDraft', async (data, photo) => { calls.push('save'); assert.equal(data.employeeId, 'employee'); assert.equal(photo.version, '1'); assert.equal(data.fields.portraitStorageKey, undefined); }],
      ...['createEmployee', 'createDraftRevision', 'submitEmployeeRevision', 'requestPublicationApproval', 'decidePublicationApproval', 'publishEmployeeProfile', 'unpublishEmployeeProfile', 'changeEmployeeStatus', 'resignEmployee', 'rejoinEmployee', 'withdrawEmployeeConsent'].map(name => [name, () => { throw Error('Unexpected action'); }]),
    ]),
  });
  const { employeeAction } = await load('app/admin/(dashboard)/employees/actions.ts');
  const form = new FormData();
  for (const [key, value] of Object.entries({ operation: 'saveDraft', employeeId: 'employee', expectedVersion: '1', revision: '1', expectedProfileVersion: '1', displayOrder: '0' })) form.set(key, value);
  form.set('employeePhoto', new File(['synthetic'], 'photo.png', { type: 'image/png' }));
  let result = await employeeAction({}, form);
  assert.equal(result.code, 'CONSENT_REQUIRED'); assert.ok(!calls.includes('upload'));
  calls.length = 0; form.set('photoUploadConsent', 'on');
  result = await employeeAction({}, form);
  assert.equal(result.status, 'success');
  assert.deepEqual(calls, ['employees.records.read', 'uploads.create', 'employees.draft.edit', 'check', 'upload', 'save']);
});


test('Workers use binding decode/re-encode, strip metadata and reject missing binding without upload', async () => {
  let transforms = 0;
  const images = {
    info: async stream => {
      const metadata = await sharp(Buffer.from(await new Response(stream).arrayBuffer())).metadata();
      return { format: 'image/' + (metadata.format === 'jpeg' ? 'jpeg' : metadata.format), width: metadata.width, height: metadata.height };
    },
    input: stream => ({ transform: options => {
      transforms++; assert.deepEqual(JSON.parse(JSON.stringify(options)), { width: 1600, height: 1600, fit: 'scale-down' });
      return { output: async options => {
        assert.equal(options.anim, false);
        const source = Buffer.from(await new Response(stream).arrayBuffer());
        const image = await sharp(source).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp().withExif({ IFD0: { Artist: 'Synthetic metadata' } }).toBuffer();
        return { response: () => new Response(image, { headers: { 'Content-Type': 'image/webp' } }) };
      } };
    } }),
  };
  const bytes = await sharp({ create: { width: 8, height: 6, channels: 4, background: '#ff000080' } }).png().toBuffer();
  const file = new File([bytes], 'synthetic.png', { type: 'image/png' });
  const f = await setup(true, images); await f.module.prepareEmployeePhoto(file, 'employee');
  const metadata = await sharp(f.calls[0].buffer).metadata();
  assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined); assert.equal(metadata.hasAlpha, true); assert.equal(transforms, 1);
  const missing = await setup(true, null);
  await assert.rejects(missing.module.prepareEmployeePhoto(file, 'employee'), /PHOTO_IMAGES_UNAVAILABLE/); assert.equal(missing.calls.length, 0);
});

test('Worker decoder errors, excessive pixels and animated containers are rejected before upload', async () => {
  const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'red' } }).png().toBuffer();
  for (const info of [async () => { throw Error('Decode error'); }, async () => ({ format: 'image/png', width: 10000, height: 10000 }), async () => ({ format: 'image/svg+xml' })]) {
    const f = await setup(true, { info, input: () => { throw Error('Must not transform'); } });
    await assert.rejects(f.module.prepareEmployeePhoto(new File([png], 'x.png', { type: 'image/png' }), 'employee'), /Invalid photo/); assert.equal(f.calls.length, 0);
  }
  const control = Buffer.alloc(20); control.writeUInt32BE(8); control.write('acTL', 4);
  const animated = Buffer.concat([png.subarray(0, 33), control, png.subarray(33)]);
  const f = await setup(); await assert.rejects(f.module.prepareEmployeePhoto(new File([animated], 'x.png', { type: 'image/png' }), 'employee'), /Invalid photo/); assert.equal(f.calls.length, 0);
});
