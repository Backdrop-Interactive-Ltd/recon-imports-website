# WORKERS-CONFIG - existing resource and secret preparation

2026-11-14, Asia/Dhaka. Documentation-only preparation; no remote writes, database operations, deployment, push or DNS changes.

Verified through authenticated Cloudflare reads:

- R2 is activated and the existing `recon-imports-next-cache` bucket is listed.
- The checked-in Wrangler binding already matches: `NEXT_INC_CACHE_R2_BUCKET` -> `recon-imports-next-cache`. No change or recreation is needed.
- The target Worker `recon-imports-website` is still absent (Cloudflare code 10007). Deployed bindings and secrets therefore cannot be verified or attached yet. Do not use secret commands that create a placeholder Worker without authorization.

Preserve completed work: existing Hyperdrive ID and verified restricted runtime credentials/cache settings, LAUNCH-06's twelve migrations and 31 records, Cloudinary assets and local backups. No recheck requiring credentials, credential rotation, database migration/import or resource recreation was performed.

## Prepared production configuration

`wrangler.jsonc` already declares the intended Worker, ASSETS, HYPERDRIVE, R2 incremental cache, IMAGES, self-reference, and Durable Object queue/tag-cache bindings. Its v1 SQLite class migration is Cloudflare metadata, not a PostgreSQL migration. Actual deployed bindings remain pending initial authorized deployment.

`workers-production-secrets.manifest.json` lists the five required secret names and safe value sources. It contains no credentials and is not an uploadable secret-bulk file. No secret values were collected or written remotely in this task. Generate/supply them privately only when authorized setup can consume them; do not copy local .env values automatically.

Canonical host stays `https://reconimports.com`, matching current SEO, sitemap and URL helpers. AUTH_URL must align. A www alias/redirect remains separate authorized domain work. No domain routes were added or changed.

## Remaining release gates

1. Obtain explicit authorization for initial Worker setup/deployment and secret attachment; use private input and Cloudflare secret storage. Worker creation must not be disguised as a secret-only operation.
2. Keep using the existing isolated `npm run build:workers` workflow. Do not embed credentials in the bundle. The prior successful build/dry run and TypeScript results remain applicable because application/deployment code did not change here.
3. Verify the first public cache serves approved Supabase branding/content rather than build-time fallback settings/inventory. See WORKERS-PREFLIGHT; this was not silently marked resolved by R2 activation.
4. During an authorized release, verify the actual deployed bindings, HTTPS login/logout/session behavior, media delivery and cache invalidation. Preserve no-store private routes and fresh employee authorization reads.
5. Retain LAUNCH-06's encrypted post-import backup off-site with the key separately. Do not repeat database migrations/import.

Validation in this task checks the manifest against the actual Wrangler R2/Hyperdrive IDs and expected secret names; it also rejects embedded password/token properties. Only this report and the nonsecret manifest enter the local task commit.

Status: **PREPARATION COMPLETE; remote secret attachment/deployment pending authorization.**
