# Employee photo Workers compatibility

> Status clarification ? RCI-GIT-02 (2026-11-21): Historical compatibility evidence. Workers tooling is retained for reference, but new production deployments are paused. Future hosting is planned for LimdaHost VPS, using the existing Node.js/Sharp branch. The recorded test results below are historical, not newly executed by repository reconciliation.

## Runtime change
The shared upload module no longer loads native Sharp at module initialization. It selects the request-scoped IMAGES binding for Workers and dynamically loads photoProcessingNode only for Node.js/localhost/VPS requests. A missing Worker binding fails closed. No new dependency, production binding, credentials or database change is required.

Cloudflare Images info/decode, scale-down and WebP output replace Sharp inside Workers. The existing signed Cloudinary upload helper and employee draft/permission/consent checks remain unchanged. Validation retains the 3 MB limit, allowed raster formats, actual container/decoder validation, 20-million-pixel limit, animation rejection and metadata stripping. PNG/WebP container checks run before transformation; EXIF, XMP and ICC are explicitly removed from uploaded WebP derivatives.

## Repeatable local workerd test
1. Run `node tests/workers/prepareEmployeeMedia.mjs` from the project root.
2. Disable dotenv loading for Wrangler in the test shell: `$env:CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV='false'`.
3. Run `npx wrangler dev --local --config .local/employee-media-worker.json --port 0 --ip 127.0.0.1`.
4. Use the displayed ephemeral localhost address with `node tests/workers/employeeMediaSmoke.mjs http://127.0.0.1:PORT`.
5. Stop only this test runner afterward. The existing Next.js server on localhost:3000 remains untouched.

This entrypoint is under tests, outside the production build allowlist. It has no database binding and uses synthetic test constants only. Every outbound Cloudinary fetch is intercepted before network access. It exercises the real signed multipart helper without creating assets. Its QR alias matches the Node server entry selected by the Next/OpenNext production artifact; it does not change production QR code.

## Verified results
- Actual workerd with local IMAGES binding: JPG/PNG/WebP decode, resize to at most 1600 pixels, transparency retention, metadata stripping and signed multipart capture passed.
- Invalid/corrupt, SVG, oversized, over-20-million-pixel and animated inputs rejected without an upload request. Missing binding rejected without native fallback.
- PNG QR download decoded independently to https://www.reconimports.com/team/RI-EMP-101.
- 43 focused feature/security/startup tests passed; TypeScript and isolated Next production build passed.
- OpenNext Workers build, artifact secret exclusion and local Wrangler dry run passed (17866.99 KiB raw / 4628.11 KiB gzip). No upload or deployment occurred.
- No real Cloudinary asset was created. No employee profile, approval or database record was modified. Production upload/session/network verification remains a separately authorized release check.

Official API reference: https://developers.cloudflare.com/images/optimization/binding/
