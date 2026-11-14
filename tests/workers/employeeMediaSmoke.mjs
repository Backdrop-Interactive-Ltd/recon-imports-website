import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';

// Run only against the local synthetic probe, never the real application or a remote origin.
const origin = new URL(process.argv[2]);
assert.equal(origin.protocol, 'http:'); assert.equal(origin.hostname, '127.0.0.1');
assert.ok(origin.port && origin.port !== '3000');
const results = [];
async function upload(bytes, name, type, suffix = '') {
  return fetch(new URL('/photo' + suffix, origin), { method: 'POST', headers: { 'Content-Type': type, 'X-File-Name': name }, body: bytes, signal: AbortSignal.timeout(20000) });
}
for (const format of ['jpeg', 'png', 'webp']) {
  const bytes = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: '#ff000080' } })[format]().withExif({ IFD0: { Artist: 'Synthetic private metadata' } }).toBuffer();
  const response = await upload(bytes, 'synthetic.' + format, 'image/' + format);
  assert.equal(response.status, 200, await response.clone().text()); assert.equal(response.headers.get('x-signed-upload'), 'true');
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 1600); assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined); assert.equal(metadata.xmp, undefined);
  if (format !== 'jpeg') assert.equal(metadata.hasAlpha, true);
  results.push(format + ' decode/resize/metadata stripping/signed multipart');
}
const png = await sharp({ create: { width: 8, height: 6, channels: 4, background: '#ff000080' } }).png().toBuffer();
const control = Buffer.alloc(20); control.writeUInt32BE(8); control.write('acTL', 4);
const apng = Buffer.concat([png.subarray(0, 33), control, png.subarray(33)]);
const massive = await sharp({ create: { width: 5000, height: 4001, channels: 3, background: 'red' } }).png().toBuffer();
for (const [bytes, name, type, suffix, code] of [
  [Buffer.from('not an image'), 'x.png', 'image/png', '', 'INVALID_PHOTO'],
  [Buffer.from('<svg/>'), 'x.svg', 'image/svg+xml', '', 'INVALID_PHOTO'],
  [Buffer.alloc(3 * 1024 * 1024 + 1), 'x.png', 'image/png', '', 'INVALID_PHOTO'],
  [massive, 'x.png', 'image/png', '', 'INVALID_PHOTO'],
  [apng, 'x.png', 'image/png', '', 'INVALID_PHOTO'],
  [png, 'x.png', 'image/png', '?missingImages=1', 'PHOTO_IMAGES_UNAVAILABLE'],
]) {
  const response = await upload(bytes, name, type, suffix); assert.equal(response.status, 422);
  const result = await response.json(); assert.equal(result.error, code); assert.equal(result.outboundUpload, false);
}
results.push('corrupt/SVG/oversize/excess pixels/animation/missing binding rejected without upload');
const qrResponse = await fetch(new URL('/qr', origin));
assert.equal(qrResponse.status, 200); assert.equal(qrResponse.headers.get('content-type'), 'image/png');
assert.match(qrResponse.headers.get('content-disposition'), /attachment; filename="RI-EMP-101-qr.png"/);
const qr = await sharp(Buffer.from(await qrResponse.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(jsQR(new Uint8ClampedArray(qr.data), qr.info.width, qr.info.height)?.data, 'https://www.reconimports.com/team/RI-EMP-101');
results.push('QR PNG download independently decoded to permanent production URL');
console.log(JSON.stringify({ status: 'WORKER_MEDIA_SMOKE_PASSED', checks: results, databaseBindings: 0, realCloudinaryRequests: 0 }));
