# WORKERS-INITIAL - initial deployment

2026-11-14, Asia/Dhaka. Completed under the owner's explicit plan-bound deployment approval. URL: https://recon-imports-website.backdropinteractiveltd.workers.dev

The existing isolated OpenNext artifact was deployed once. Existing Hyperdrive ID `02364ff5b23e47a8889958733e06d1da` and R2 bucket `recon-imports-next-cache` were reused. No database migrations, imports, password changes, application-record writes or Cloudinary asset operations were run.

## Production configuration

Remote settings were read after deployment and verified:

- ASSETS, WORKER_SELF_REFERENCE, HYPERDRIVE, NEXT_INC_CACHE_R2_BUCKET, NEXT_CACHE_DO_QUEUE, NEXT_TAG_CACHE_DO_SHARDED and IMAGES bindings exist. Hyperdrive ID and R2 bucket match the approved configuration. Both configured Durable Object namespaces were created through the existing v1 class declaration.
- AUTH_SECRET, AUTH_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are secret_text bindings. Values were never printed. Cloudinary GET /ping and the expected product environment were verified privately before upload.
- AUTH_SECRET was generated specifically for this Worker. AUTH_URL uses the workers.dev endpoint for initial authentication. Existing SEO canonical URLs remain https://reconimports.com; custom-domain attachment and DNS remain separate owner-authorized work.
- No local DATABASE_URL, ADMIN_PASSWORD, database operator/migrator credentials or uploaded local media were supplied as Worker secrets/assets.

The secret bundle is encrypted with Windows DPAPI CurrentUser in a protected Git-ignored directory. It is machine/user-bound and is not a portable recovery backup. A private temporary JSON was supplied through Wrangler's secrets-file option in the isolated build directory, then deleted in finally. No credential values were passed as shell arguments or retained in logs/source.

The upload did not bulk-populate R2 with build-time fallback pages. Public requests rendered verified production branding. The database's approved record count remains the LAUNCH-06 inventory; no vehicle records were added by deployment. Existing fallback inventory behavior was not redesigned.

## Executed verification

The initial deployment command succeeded. Its first HTTPS verification returned ERR_ASSERTION; that receipt did not retain which response/assertion failed, so its exact cause is **Not Verified**. There was no automatic redeploy. Subsequent read-only checks all passed, and the original failure evidence is retained. Future checks now save a safe route/status checkpoint before assertions.

- Home, About Us, admin login and auth/session: HTTP 200.
- Home HTML contains all three approved Cloudinary asset public IDs: websiteLogo, footerLogo and favicon.
- Anonymous /admin: HTTP 307 to /admin/login. Admin/login/session responses have no-store headers.
- Next Image optimization for the existing hero: HTTP 200, image/webp.
- Actual remote binding names/types and all five secret names verified without reading values.
- TypeScript and focused deployment/secret/Workers compatibility tests passed. Windows dialog, native-client and DPAPI checks passed during preparation. The previously validated Workers artifact/build and local dry run were reused; application code did not change.
- Real administrator login/logout/browser cookie enforcement and production media uploads were **not tested**. Anonymous protection and live database-backed branding are verified; do not infer full browser-flow coverage.

Private evidence: `.local/launch06/20261114151132579-workers-secret-preparation-f46b8ab2/`, including plan, explicit authorization, upload completion, initial failure and successful verification-followup. The plaintext secret-upload file is absent.

Safe tooling: workers-secret-prepare.mjs, workers-secret-prompt.ps1, workers-initial-deploy.mjs, workers-initial-deploy.ps1, focused tests, and labelled masked-input additions to the existing Windows helper. These operator tools are separate from deployed application code.

No GitHub push, custom-domain attachment, DNS changes, repeat database setup or changes to original media/backups were performed. Next steps: owner review of the workers.dev site, then separately authorize custom-domain/auth-origin alignment and the required live browser tests. Keep the LAUNCH-06 post-import recovery backup off-site.
