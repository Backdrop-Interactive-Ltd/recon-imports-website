# WORKERS-PREFLIGHT - deployment readiness

2026-11-14, Asia/Dhaka. Base main: `f1c80a19053850eb4dfddc03fe41368e971cef19`.

Local Workers packaging is verified. Production launch remains blocked by unverified Cloudflare account configuration and initial public-content verification. This task changed documentation only. No database connections, migrations/imports, secret updates, resource provisioning, push, deployment or DNS changes were performed.

## Verified locally

- Next 16.4.6, OpenNext Cloudflare 1.20.17, Wrangler 4.162.0 and Prisma 7.10.1 remain installed; no dependency installation/update was needed. The existing isolated build reused its matching dependency cache.
- `wrangler.jsonc` retains HYPERDRIVE ID `02364ff5b23e47a8889958733e06d1da`, Worker name `recon-imports-website`, nodejs_compat, ASSETS, self-reference, IMAGES, R2 and Durable Object cache bindings.
- Workers resolve request-scoped HYPERDRIVE connections. Ordinary Node/VPS development keeps DATABASE_URL. No local database URL was copied into production configuration.
- Production media uses signed Cloudinary HTTPS; local filesystem uploads are restricted to development. Cloudinary credentials remain server-side.
- `npm run build:workers`: adapter build and local-only Wrangler upload dry run passed; 17,256.63 KiB raw / 4,504.89 KiB gzip. The validator found no embedded environment values/files or local uploads. Nothing uploaded.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Final artifact scan checked 26,246 files and found no configured local credential values. All 96 protected environment/media/backup evidence files retained their checksums.
- `node --experimental-vm-modules --test tests/security/workersArtifact.test.mjs tests/security/workersCompatibility.test.mjs`: 4 passed. An initial invocation without the required VM flag failed two harness tests; the corrected command passed all four.
- OpenNext Windows support, broad WASM tracing, PDF/fontkit duplicate-key and experimental VM warnings remain. These checks do not establish hosted Hyperdrive, account limits or deployed HTTPS authentication.

## Missing or unverified configuration

Wrangler whoami reports **not authenticated**. No Cloudflare login or remote configuration writes were attempted. Remote resource/secret presence is **Not Verified**, rather than assumed missing.

| Item | Required verification before an authorized deployment |
| --- | --- |
| Hyperdrive origin | Existing resource must target the verified Supabase production database using recon_runtime and its saved password, never recon_migrator, postgres/operator or localhost. Origin/TLS/current role remain remotely unverified. |
| Hyperdrive query cache | Confirm disabled at the resource; the Wrangler comment does not configure it. Fresh authorization/employee eligibility reads must not reuse cached SQL results. |
| Worker secrets | Confirm names AUTH_SECRET, AUTH_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET exist for this Worker/environment. Values were not inspected or copied. Cloudinary must match the verified media product environment and rotated key pair. |
| Database secret | HYPERDRIVE supplies the runtime connection; DATABASE_URL is not required with the existing binding. Never put operator/migrator passwords, ADMIN_PASSWORD or local PostgreSQL URLs into Worker settings. |
| Public cache | Verify R2 bucket recon-imports-next-cache exists in the deployment account; confirm configured Durable Object classes, self-reference and IMAGES availability. Wrangler's migrations here are Cloudflare class declarations, not PostgreSQL migrations. |
| Domain/auth alignment | No routes/custom domains are declared in Wrangler. SEO, sitemap and public URL helpers currently use https://reconimports.com. Align AUTH_URL and chosen canonical host; decide www redirection before any authorized domain/DNS work. |
| Recovery | Retain LAUNCH-06's encrypted post-import backup off-site and save the key separately. Earlier off-site confirmation covered the pre-change backup only. |

Local .env has auth variable names present but no Cloudinary credentials. This does not prove remote secret presence or absence; local secrets are not production configuration and were not reused.

Hyperdrive query caching is enabled by default according to the [official documentation](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/). Verify the existing resource explicitly; do not infer safety from the binding ID. Existing adapter/binding conventions were checked against [OpenNext setup](https://opennext.js.org/cloudflare/get-started).

## Initial public content

The isolated build deliberately excludes local/production credentials. It therefore logged missing DATABASE_URL during prerendering and generated fallback public pages. Public settings loaders catch database errors and return defaults; Home/About/inventory use ISR. Packaging success is not proof that the initial deployed branding/inventory uses the 27 production settings and three Cloudinary references.

Before go-live, verify an approved initialization/revalidation path serves Supabase-backed branding/content and does not leave fallback inventory/settings in the initial cache. Do not solve this by embedding credentials in the artifact, importing more data, rerunning migrations or copying public/uploads into Worker assets. No application rendering behavior was changed in this preparation task.

## Next authorized steps

1. Authenticate Wrangler to the intended account; perform read-only inspection of Hyperdrive, secret names and cache/image resources. Never request secrets in chat.
2. Review exact missing settings and obtain authorization for any remote configuration changes. Supply secret values privately; preserve existing valid values.
3. Resolve canonical-host alignment and initial public-cache verification. Keep private responses and employee eligibility fresh.
4. Only after separate owner authorization: push the reviewed source if requested, deploy with the existing isolated build workflow, and configure domains/DNS if requested. Verify real HTTPS login/logout, sessions, branding, images and settings invalidation after deployment. Never rerun LAUNCH-06 migrations/import.

Status: **NEEDS CONFIGURATION VERIFICATION**. No push or deployment authorized or performed.
