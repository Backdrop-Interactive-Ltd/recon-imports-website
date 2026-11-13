import assert from 'node:assert/strict';

// Pure payload preparation only: no database, filesystem, upload or network call.
// Invoke later only with owner-approved, verified Cloudinary mappings.
export function mapActiveMedia(settings, media, mappings, cloudName) {
  assert.match(cloudName,/^[a-z0-9_-]+$/i);
  const keys=['websiteLogo','footerLogo','favicon'];
  const active=settings.filter(row=>keys.includes(row.key));
  assert.equal(active.length,3);
  assert.equal(new Set(active.map(row=>row.key)).size,3);
  const urls=new Set(active.map(row=>row.value));
  assert.equal(urls.size,3);
  const selected=media.filter(row=>urls.has(row.fileUrl));
  assert.equal(selected.length,3);
  assert.equal(new Set(selected.map(row=>row.id)).size,3);
  assert.equal(new Set(selected.map(row=>row.fileUrl)).size,3);
  assert.equal(mappings.length,3);
  assert.equal(new Set(mappings.map(row=>row.mediaId)).size,3);
  const replacements=new Map();
  for(const mapping of mappings) {
    const row=selected.find(row=>row.id===mapping.mediaId);
    assert.ok(row);
    assert.equal(mapping.sourceUrl,row.fileUrl);
    const target=new URL(mapping.targetUrl);
    assert.equal(target.protocol,'https:');
    assert.equal(target.hostname,'res.cloudinary.com');
    assert.equal(target.username,'');assert.equal(target.password,'');
    assert.equal(target.port,'');assert.equal(target.search,'');assert.equal(target.hash,'');
    assert.ok(target.pathname.startsWith(`/${cloudName}/image/upload/`));
    assert.match(target.pathname,/\/v[1-9][0-9]*\/.+/);
    replacements.set(row.fileUrl,target.href);
  }
  assert.equal(new Set(replacements.values()).size,3);
  return {
    settings:settings.map(row=>replacements.has(row.value)&&keys.includes(row.key)?{...row,value:replacements.get(row.value)}:{...row}),
    media:selected.map(row=>({...row,fileUrl:replacements.get(row.fileUrl)})),
  };
}
