# GitHub main → existing Worker (prepared, not enabled)

Task: WORKERS-CI. Target: existing `recon-imports-website` only.

## Prepared configuration

Use **Workers & Pages → recon-imports-website → Settings → Builds**. Do not use Create Worker or Pages. Reuse an existing repository connection if one exists; its state is currently unverified because the cached Wrangler OAuth session receives HTTP 403 / code 10000 on both build configuration and build-token reads.

| Setting | Value |
| --- | --- |
| Repository | `Backdrop-Interactive-Ltd/recon-imports-website` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build:workers` |
| Deploy command | `node scripts/deploy-workers-ci.mjs --deploy` |
| Preview / non-production branch builds | Disabled |
| Node version | `24.18.1` (version used for local verification) |
| Additional build variable | `RECON_AUTODEPLOY_ENABLED=1` — **set only after owner approval** |

Use lockfile installation with development dependencies available. Do not set production-only dependency installation: Prisma CLI, TypeScript, Wrangler and the adapter build require tooling. Workers Builds supplies `WORKERS_CI=1` and the actual `WORKERS_CI_BRANCH`; do not manually spoof them. No Prisma migrate, seed, import or backup commands belong in this build/deploy pipeline.

The existing isolated build script generates a workerd-targeted Prisma client only in the disposable staging copy, scans the artifact, excludes local uploads and environment files, and performs a local Wrangler dry run. Hyperdrive provides the production runtime database connection; the build intentionally has no database credentials. Existing build-time fallback warnings do not authorize adding production database credentials or prepopulating R2 with fallback content.

## Credentials and preservation

- Grant the Cloudflare GitHub App access to **only this repository**. An organization owner may need to approve installation. Do not grant all-repository access when repository selection is available.
- For a custom deployment/build token, begin with **Workers Scripts: Edit**, scoped to only the existing Cloudflare account. Set the explicit `CLOUDFLARE_ACCOUNT_ID`; no global key or cached personal OAuth token belongs in CI. Cloudflare account-level script access is broader than a single Worker, so the helper additionally fixes the target name and refuses a missing Worker. Binding-related additional permissions, if actually rejected by Cloudflare during validation, require review; do not preemptively grant all-zone DNS edit, R2 write, database, billing or unrelated-account privileges. Live deployment-token sufficiency has not been verified.
- The separate setup API token, if using the API rather than Dashboard, needs **Workers Builds Configuration: Edit** and **Workers Scripts: Read**, limited to this account. It is not the runtime/deployment token. Enter all tokens privately; never in Git or chat.
- Keep the five existing Worker runtime secrets in place. Do not copy AUTH_SECRET, AUTH_URL, Cloudinary credentials, DATABASE_URL, ADMIN_PASSWORD or migrator credentials into build variables. The helper refuses runtime credentials in its deploy environment and supplies no secret upload file.
- The helper verifies the existing Worker's required secret names before deployment and compares binding/secret descriptors, CPU limits and usage model afterward. It does not retrieve secret values. Current bindings, Hyperdrive ID, R2 bucket and Durable Object configuration are reused. There is no secret setter, database operation or resource-creation path in the helper itself.
- Custom Domains are omitted from the temporary upload configuration so unattended Wrangler deployment cannot force-replace DNS. Existing www/apex domains stay managed separately. The helper stops on errors without an automatic retry; a failed after-check requires operator review because an upload may already have completed.

The native Dashboard's automatically generated token template is broader than this starting scope. Review its permissions instead of accepting unrelated write privileges. Native documentation: [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Builds API and separate setup/build tokens](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/).

## Verification and enabling gate

Executed local verification: nine tests passed across `workersCi`, `workersCompatibility`, `wwwDomainSafety` and `apexRedirect`; `npx tsc --noEmit --incremental false` passed; `npm run build:workers` passed, including Next.js/OpenNext production compilation, artifact scan and Wrangler dry run (17,257.8 KiB raw / 4,505.07 KiB gzip). The separate `node scripts/deploy-workers-ci.mjs --dry-run` passed and uploaded nothing. Existing database-free prerender fallback, Windows adapter, broad WASM trace and fontkit duplicate-key warnings remain. Linux-hosted Workers Builds execution and deployment-token permissions remain unverified until the integration is authorized and available.

Only after all local checks pass, commit the safe helper/tests/report locally. Request owner authorization for pushing that commit and enabling the main-only production integration, including any initial build/deployment started by connecting it. Do not set the enable flag, save an active production connection, create tokens or start a build before approval. Once authorized, first read existing build settings with the proper credentials, preserve unrelated settings, then apply only this configuration. Never create a second integration if one already targets this Worker.

After enabling, verify the configured repository/branch, disabled previews, first build outcome and deployed commit. Confirm HTTPS, redirects, branding and secret/binding preservation. Do not claim admin login is fixed: the existing bcrypt/Workers Free CPU limitation is independent of CI and remains unresolved. No billing change is part of this task.

Disable the production trigger/enable flag to stop future automatic deployments. For a bad release, use an approved previous Worker version; do not roll back database records or rewrite Git history. Never retry deployment blindly after an upload error.
