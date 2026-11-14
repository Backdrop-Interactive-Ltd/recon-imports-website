// Local workerd probe only. No database bindings or real credentials. Not a production entrypoint.
import { prepareEmployeePhoto } from '../../lib/employees/photoUpload';
import { generateEmployeeQr } from '../../lib/employees/qr';

export default { async fetch(request: Request, env: Record<string, unknown>, ctx: unknown) {
  const url = new URL(request.url);
  if (url.pathname === '/qr') {
    const png = await generateEmployeeQr('RI-EMP-101');
    return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'attachment; filename="RI-EMP-101-qr.png"', 'Cache-Control': 'private, no-store' } });
  }
  const global = globalThis as typeof globalThis & { [key: symbol]: unknown };
  global[Symbol.for('__cloudflare-context__')] = { env: url.searchParams.has('missingImages') ? {} : env, ctx };
  process.env.CLOUDINARY_CLOUD_NAME = 'synthetic-test-cloud';
  process.env.CLOUDINARY_API_KEY = 'synthetic-test-key';
  process.env.CLOUDINARY_API_SECRET = 'synthetic-test-secret';
  let uploaded: ArrayBuffer | undefined, signed = false;
  const originalFetch = globalThis.fetch;
  // Capture every outbound fetch. No request can reach Cloudinary or any external service.
  globalThis.fetch = async (input, options) => {
    if (String(input) !== 'https://api.cloudinary.com/v1_1/synthetic-test-cloud/image/upload' || options?.method !== 'POST' || !(options.body instanceof FormData)) throw Error('UNEXPECTED_NETWORK_REQUEST');
    const body = options.body;
    signed = typeof body.get('signature') === 'string' && String(body.get('signature')).length === 64 && !body.has('api_secret') && body.get('folder') === 'recon-imports/admin/employees/synthetic-employee';
    const file = body.get('file'); if (!(file instanceof File)) throw Error('INVALID_UPLOAD_BODY');
    uploaded = await file.arrayBuffer();
    return Response.json({ public_id: 'synthetic-public-id', secure_url: 'https://res.cloudinary.com/synthetic-test-cloud/image/upload/v1/photo.webp', version: 1 });
  };
  try {
    const file = new File([await request.arrayBuffer()], request.headers.get('X-File-Name') || 'synthetic.png', { type: request.headers.get('Content-Type') || 'image/png' });
    await prepareEmployeePhoto(file, 'synthetic-employee');
    if (!uploaded) throw Error('UPLOAD_NOT_CAPTURED');
    return new Response(uploaded, { headers: { 'Content-Type': 'image/webp', 'X-Signed-Upload': String(signed) } });
  } catch(error) {
    return Response.json({ error: error instanceof Error && error.message === 'PHOTO_IMAGES_UNAVAILABLE' ? 'PHOTO_IMAGES_UNAVAILABLE' : 'INVALID_PHOTO', outboundUpload: !!uploaded }, { status: 422 });
  } finally {
    globalThis.fetch = originalFetch; delete global[Symbol.for('__cloudflare-context__')];
    delete process.env.CLOUDINARY_CLOUD_NAME; delete process.env.CLOUDINARY_API_KEY; delete process.env.CLOUDINARY_API_SECRET;
  }
} };
