# DEPLOY-04B: portable Workers runtime

Local implementation, 2026-11-14. No push, deployment, DNS changes, production database connection, media transfer or PostgreSQL migration. Base: `0d56499ff17c71deda59ee8641733ca79f433248`. Final commit is recorded in the task response.

## Adapter and versions

OpenNext `@opennextjs/cloudflare` **1.20.17**, Wrangler **4.162.0**, workerd **1.20261113.1**. Existing Next **16.4.6**, React/React DOM **19.2.6**, Prisma Client/CLI/pg adapter **7.10.1**, pg **8.20.0**, NextAuth **5.0.0-beta.32**, Cloudinary **2.10.0**, Sharp **0.35.5** remain unchanged. Tested with Node **24.18.1**, npm **11.16.0**.

Cloudflare's current general guide favors vinext. Vinext 1.4.5 requires React/React DOM/react-server-dom-webpack ^19.3.1 and Vite ^8. OpenNext's current peer range accepts Next >=16.4.5 and retains Next's own App Router, Server Actions, SSR and build pipeline. Choosing OpenNext is a project-specific judgment to minimize migration, not a claim that vinext is unsupported. See [Cloudflare's Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [OpenNext setup](https://opennext.js.org/cloudflare/get-started).

The checked-in DEPLOY-04A security report was reviewed. A separate DEPLOY-01 report was not found in the repository; its runtime concerns were rechecked against actual imports, configuration and runtime behavior here.

The adapter initially introduced three moderate audit entries through glob/minimatch. A scoped override selects glob **14.0.6** only for OpenNext, bringing its minimatch chain onto patched **11.0.8**. OpenNext's glob/globSync calls and options are exercised by a full adapter build. No framework major upgrade or force-fix. [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [patched release](https://github.com/isaacs/node-glob/releases/tag/v14.0.6).

## Build and local preview

```powershell
npm ci
npm run dev
# Standard Node/VPS production build and server remain available:
npm run build
npm start
# Workers artifact only; does not deploy or provision resources:
npm run build:workers
npm run preview:workers
```

Build dependencies must be installed. Stop a running Workers preview before rebuilding, particularly on Windows, where watched files can be locked. Standard `dev` remains Next's Webpack dev server; `dev:local` still uses the existing persistent PostgreSQL setup.

`scripts/build-workers.mjs` builds a source copy under `.local/workers-build/source`, with an explicit input allowlist. It excludes local env files, uploads, Git metadata, databases, backups and generated root outputs. It runs locked `npm ci` in that copy, reusing dependencies only when the lockfile hash matches, then invokes OpenNext. The conventional `.next` layout is used inside the copy, without changing the owner's normal/test dist directories or source type metadata.

This isolation is deliberate: the adapter's `compileEnvFiles` normally embeds all project `.env` values, even when the shell overrides DATABASE_URL. Never bypass this wrapper with a direct adapter build in a workspace containing local secrets. Artifact validation rejects embedded env values, env files and copied local uploads before replacing the ignored root `.open-next` output. Wrangler also ignores uploads through `public/.assetsignore`.

The wrapper also performs a **local-only Wrangler deploy --dry-run**, checks its exit status, and rejects an upload exceeding the current documented **64 MiB uncompressed** limit. Despite the command name, `--dry-run` does not upload or deploy. The gzip number is informational, not the current platform limit. Workers-only tracing excludes unused Prisma tooling/provider and PGlite WASM from node_modules; the generated PostgreSQL compiler under lib/ remains included. This reduces the measured bundle from 60,108.33 KiB raw / 19,367.37 KiB gzip to 17,256.62 KiB raw / 4,504.93 KiB gzip. See [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

OpenNext warns that Windows is not fully supported. Its traced-file copier recreates Turbopack directory links without a Windows link type, causing EPERM without symlink privileges. The build-only Windows helper uses directory junctions exclusively between the staged `.next/standalone` and staged `.open-next`; all other link operations retain their original behavior. It does not patch installed packages or change application runtime code. Linux builds do not apply the workaround. A Linux CI build is still required before a future release.

Keep the staging directory until preview/deployment has consumed the artifact: OpenNext can emit absolute references to staged WASM files. `.open-next` is a generated build artifact, not an independently relocatable release archive. Use the wrapper in the build job that will consume it.

## Prisma/PostgreSQL

The first successful bundle still failed real queries: the normal Node client dynamically compiles embedded WASM, which Workers forbids. The wrapper changes **only the client generator runtime to workerd in the staged schema copy** before generation. No model, source schema, migration, owner-generated Node client or database is changed. The generated Worker client imports precompiled WASM. See [Prisma's Workers guide](https://www.prisma.io/docs/guides/v7/deployment/cloudflare-workers).

`lib/runtime/cloudflare.ts` isolates the platform context. Workers use HYPERDRIVE.connectionString, or an explicit DATABASE_URL Worker secret if Hyperdrive is absent; missing bindings fail rather than falling back to the owner's Node URL. A WeakMap keyed by each request's execution context holds its Prisma client. `maxUses: 1` closes released sockets, preventing reuse across requests while retaining connections until their transactions complete. Node development/VPS hosting keeps its existing lazy singleton and DATABASE_URL.

Before production, provision persistent PostgreSQL with supported TLS, backups/PITR and an approved restore/migration plan. Hyperdrive is recommended for connection pooling. **Disable Hyperdrive query caching**: role changes, disabled accounts, settings, consent, resignation and employee eligibility require fresh reads. The checked-in config intentionally has no fake production Hyperdrive ID. Add the provisioned binding ID later; never configure localhost/recon_local as production. Direct remote TLS DATABASE_URL is an alternative, but was not tested against a real hosted provider.

No production database was contacted. Local smoke tests use a zero-valued Hyperdrive ID with a localConnectionString to the provenance-verified, synthetic EID-03 database. This local emulation does not prove hosted Hyperdrive TLS, routing, pooling limits or latency. PostgreSQL schema deployment and any approved data transfer must be separate owner-authorized release steps.

## Media

Cloudinary uploads now use signed HTTPS multipart FormData with Web Crypto SHA-256, matching [Cloudinary's signature procedure](https://cloudinary.com/documentation/authentication_signatures). The API secret stays server-side. Folder prefixes, public IDs, delivery transforms and saved Media URLs keep their existing behavior. Admin, sell-car and requirements uploads share the helper. No media was uploaded to a live provider during this task.

Local development still decodes/re-encodes files through Sharp and writes `public/uploads`. That module is dynamically imported only under the development condition and eliminated from production route code. Production uploads return 503 without cloud credentials and never use a persistent local filesystem fallback. The adapter excludes native Sharp; Next Image uses the IMAGES binding and ASSETS for bundled public images. Image delivery and PDF generation were tested in workerd.

Existing `/uploads/...` DB references are unchanged. Those files intentionally do not enter Worker assets. Before production, separately approve copying applicable public media to Cloudinary and updating the corresponding references, or provide an approved persistent compatibility service for those exact URLs. Private employee portraits remain unpublished under the existing policy. No image/reference migration is performed here.

## Authentication, authorization and caching

Existing NextAuth Credentials/JWT behavior, bcrypt verification, exact-origin redirect policy, live DB authorization and Server Actions remain in place. `/admin` and `/api` retain no-store headers. Do not add CDN Cache Everything rules over authenticated routes or Server Actions.

Wrangler config supplies R2 incremental cache, Durable Object revalidation queue, Durable Object tag cache without regional stale caching, self-reference service and Images binding. These preserve public ISR and `revalidatePath`; authenticated routes remain dynamic. The `migrations` field declares **Cloudflare Durable Object classes only**, not PostgreSQL migrations. No migration command was executed. See [OpenNext caching](https://opennext.js.org/cloudflare/caching).

Employee publication, consent and employment queries remain uncached SQL checks. Their production service logic is unchanged. There is currently no employee public/admin page route in this codebase; the smoke helper uses a separate **test-only** Worker entrypoint to execute real employee query functions in workerd. This entrypoint is outside the build input allowlist and is never referenced by production wrangler.jsonc. Node service tests create a synthetic publication; Worker reads confirm it is visible, then immediately hidden after the real resignation service executes.

Any future employee page/API must remain dynamic and must not wrap eligibility results in ISR, a data cache, or a stale-positive fallback.

## Production infrastructure checklist (not provisioned)

| Item | Required setup |
| --- | --- |
| Database | Persistent PostgreSQL; restricted application role; TLS; backup/PITR; separately approved migrations/data transfer |
| Database binding | Provisioned HYPERDRIVE with query cache disabled, or remote TLS DATABASE_URL secret |
| Auth | Strong AUTH_SECRET; AUTH_URL=https://reconimports.com; preserve existing trust/callback/session policy; secure HTTPS cookies |
| Media | CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET; approved handling of existing local media URLs |
| Public cache | R2 bucket recon-imports-next-cache and the configured Durable Object classes/self-reference binding |
| Images | IMAGES binding and appropriate account service availability |
| Worker | Appropriate paid CPU/bundle limits for Next, bcrypt and PDF/WASM; verify limits with a release dry run/load test |
| Domain | Owner-managed reconimports.com route/custom domain and www canonical redirect; HTTPS; no cache override for private paths |
| Build secrets | No local .env files in build inputs; runtime secrets supplied through Workers secret storage |

Do not automatically set up DNS or GitHub deployment jobs. No deployment script was added. Keep production secrets out of Wrangler vars and Git. Canonical metadata already points to https://reconimports.com. Test actual HTTPS cookie handling, hosted Cloudinary upload/delivery, hosted Hyperdrive and account limits in an approved staging release before production.

## Reproducible verification

Existing disposable runner manifests must already exist and their synthetic clusters must be running. These commands refuse the owner/production database. The smoke preparation creates a synthetic admin and ignored local credentials/config; it does not provision Cloudflare resources.

```powershell
node scripts/data02-disposable.mjs run node scripts/build-workers.mjs
node scripts/data02-disposable.mjs run build
node scripts/data02-disposable.mjs run node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/eid03-disposable.mjs run node tests/workers/prepare.mjs
$env:WRANGLER_SEND_METRICS='false'
$env:CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV='false'
npm run preview:workers -- --config .local/workers-smoke/wrangler.json --port 8788 --persist-to .local/workers-smoke/state
# In another terminal:
node scripts/eid03-disposable.mjs run node --import tsx --experimental-vm-modules tests/workers/runtimeSmoke.mjs
```

Do not run prepare concurrently with an earlier smoke test. The smoke script disables its synthetic admin on exit. Node HTTP smoke uses a manual cookie jar to inspect Secure cookies on loopback HTTP; real browser HTTPS/SameSite enforcement is not claimed.

Verification results, exact file list, final commit and preservation evidence are supplied in the completion report. Raw logs and synthetic credentials remain under ignored `.local`, never in Git.

## Verification record

- Employee suite: 28 passed; no failures/skips. Publication isolation, consent, authorization, SQL constraints and lifecycle concurrency covered.
- Persistence/UI, authorization, redirect and Workers security tests: 23 passed, 3 skipped. The skips are pre-existing opt-in HTTP/account-lock tests targeting the owner's development database; they were intentionally not enabled. The new independent Workers HTTP checks use only disposable data.
- TypeScript and standard Next production build: passed. Standard build generated 59 pages; no type-error bypasses.
- OpenNext build and local Wrangler upload dry run: passed. Bundle is about 16.85 MiB raw / 4.40 MiB gzip, below the current uncompressed size limit. No upload/deployment.
- Local workerd smoke: 12 scenarios passed, including Credentials login/signout, secure session-token issuance, anonymous access denial, no-store headers, dashboard/settings/user pages, six concurrent database requests, real settings Server Action and path invalidation, image/PDF delivery, employee publication/resignation reads and disabled-account rejection with an existing JWT.
- Production and full npm audits: zero reported vulnerabilities. Dependency tree and Git integrity checks passed; an existing dangling Git tree is not corruption.
- The normal development server was restarted; read-only HTTP GETs of About Us, admin login and session endpoints returned 200.
- Owner preservation: all rows/counts in all 18 public tables match the initial read-only fingerprints; .env and all four original uploads remain byte-identical. No owner seeds, resets, migrations or writes.
- Generated artifact scan found no matches for the owner's configured credential values. Source review found no such values or unsafe files; the existing .env.example URL was verified to contain placeholders only.

Non-fatal upstream warnings remain: OpenNext's Windows support warning, Turbopack's broad WASM tracing warning, PDFKit/fontkit's duplicate axisIndex key, Node VM-module experimental warnings, and npm's install-script policy notices. Native tools actually used by the builds/tests were verified by execution. The old `npm run lint` script still invokes removed `next lint`; no lint success is claimed.

Hosted database/Hyperdrive behavior, real Cloudinary credentials/uploads, production HTTPS browser cookie behavior, Linux CI and account-specific CPU/memory/startup limits remain release-infrastructure checks. No production readiness beyond local compatibility is claimed.

## Exact changed files

Modified (9):

```text
.gitignore
README.md
app/api/admin/uploads/route.ts
lib/prisma.ts
lib/uploads/cloudinary.ts
next.config.mjs
package.json
package-lock.json
tests/security/moduleHarness.mjs
```

Created (16):

```text
docs/deployment/deploy-04b-workers.md
lib/runtime/cloudflare.ts
lib/uploads/local.ts
open-next.config.ts
public/.assetsignore
public/_headers
scripts/build-workers.mjs
scripts/check-workers-artifact.mjs
scripts/check-workers-upload.mjs
scripts/windows-workers-links.mjs
tests/security/workersArtifact.test.mjs
tests/security/workersCompatibility.test.mjs
tests/workers/employee-probe.mjs
tests/workers/prepare.mjs
tests/workers/runtimeSmoke.mjs
wrangler.jsonc
```

No unrelated source files changed. The source Prisma schema/migrations, authentication/business permission logic, employee services and existing media/database references are unchanged.
