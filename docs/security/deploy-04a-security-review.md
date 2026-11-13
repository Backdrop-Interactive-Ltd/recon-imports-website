# DEPLOY-04A — employee tests and dependency security

Date: 2026-11-14 (Asia/Dhaka). Local implementation and verification completed. No push or deployment. The final Codex response supplies the checkpoint hash; it cannot be embedded in its own commit.

## Employee publication test

The failing test searched the shared public name `Synthetic` and assumed its fixture would appear on the first default page of 12. The persistent disposable database contained 14 matching published fixtures; the newest employee was outside that page. This was test-data interference, not an eligibility or pagination defect.

The test now submits a unique public name containing the immutable employee database ID and uses that unique search for publication/unpublication/withdrawal assertions. It explicitly checks one result and retains contact minimization, scope separation, frozen revision, consent and authorization assertions. Production pagination, queries and rules are unchanged. The full suite passes on the populated database; a separate repeat of all three publication-policy tests also passes without cleanup/reset.

## Dependency findings: before and after

Baseline `npm audit --omit=dev`: **19 package findings: 4 critical, 11 high, 4 moderate**. Final production and full-tree audits both exit 0 and report **zero vulnerabilities**. These are package advisory findings, not independently demonstrated application exploits. Assessments below use actual application imports/configuration and do not claim historical exploitation.

Ranges are the aggregate affected ranges from the original npm report. The full advisory-specific ranges/URLs are retained in ignored `.local/DEPLOY-04A/audit-before.json`.

| Package | Kind / severity | Before | Reported vulnerable range | Verified resolution | Application reachability / assessment |
|---|---|---|---|---|---|
| @auth/core | Transitive / critical | 0.41.2 | <=0.41.2 | 0.41.3 | Auth requests are reachable. Credentials/JWT are enabled; email/OAuth-specific advisories do not match enabled providers. Malformed-token handling still warrants patching. |
| @auth/prisma-adapter | Direct / critical | 2.11.2 | <=2.11.2 | 2.11.3 | Imports affected Auth core; updated with NextAuth. Existing DB-backed authorization retained. |
| @hono/node-server | Transitive / moderate | 1.19.11 | <=2.1.2 | Removed by Prisma 7.10.1 | Prisma development tooling; no application Hono server or static-serving endpoint. Patched parent removes the affected chain. |
| @prisma/config | Transitive / high | 7.8.0 | 6.13.0-dev.1–7.10.0 or 8.1.0-dev.1–dev.4 | 7.10.1 | CLI/config loading, not a public configuration-authoring endpoint. CI/development exposure still matters. |
| @prisma/dev | Transitive / moderate | 0.24.3 | <=0.24.16 | 0.24.17 | Development tooling rather than an application route; patched parent removes affected server dependencies. |
| baseline-browser-mapping | Transitive / moderate | 2.10.29 | >=2.0.0 <2.11.0 | 2.11.37 | Next build/browser-target tooling; no website endpoint feeds user input to this API. In-range update. |
| deepmerge-ts | Transitive / high | 7.1.5 | <8.0.0 | 8.0.2 via Prisma | Config/tooling merge utility; no public arbitrary-recursive-object merge through this package. Upstream parent selects compatible dependency. |
| fast-uri | Transitive / high | 3.1.2 | 3.0.0–3.1.8 | 3.1.9 | Tooling parser; no direct application URI-parser endpoint. Safe locked resolution. |
| hono | Transitive / high | 4.12.18 | <=4.13.15 | Removed by Prisma 7.10.1 | Application is Next.js, not a Hono service; patched tooling graph removes it. |
| mysql2 | Transitive / high | 3.15.3 | <=3.23.0 | 3.24.4 | Prisma tooling dependency; application connects to PostgreSQL, not MySQL. Patched parent removes vulnerable installed version. |
| nanoid | Transitive / high | 3.3.12 | <=3.3.17 | 3.3.20 | Build/render utility via styled-jsx; not the employee ID allocator. Updated dependency resolution. |
| next | Direct / critical | 16.2.6 | 9.3.4-canary.0–16.4.0 | 16.4.6 | Public App Router, Server Actions and image processing are reachable. Some individual advisory features, such as next/og, are unused; framework patching is still required. |
| next-auth | Direct / critical | 5.0.0-beta.31 | <=0.0.0-pr.11562.ed0fce23 or 4.24.8–5.0.0-beta.31 | 5.0.0-beta.32 | Public auth and Credentials/JWT are reachable. DB-backed role/isActive checks reduce fail-open exposure but do not justify retaining vulnerable library code. |
| postcss | Transitive / high | 8.4.31 | <=8.5.22 | 8.5.23 | Build-time CSS processing; no public arbitrary CSS compilation endpoint. Updated by patched Next. |
| prisma | Direct tooling / high | 7.8.0 | 6.13.0-dev.1–7.10.0 or 8.0.0-rc.3–8.1.0-dev.6 | 7.10.1 | CLI/dev dependency and optional peer graph. Runtime uses separate Prisma Client. Family aligned on major 7. |
| sharp | Transitive affected copy / high | Next-nested 0.34.5 | <=0.35.5-rc.1 | Deduplicated to 0.35.5 | Next image processing is reachable. Root sharp 0.35.5 was already outside the listed vulnerable ranges. |
| source-map-js | Transitive / high | 1.2.1 | 1.0.0–1.2.1 | 1.2.2 | Build/source-map processing, not a public source-map parser endpoint. Updated locked resolution. |
| valibot | Transitive / moderate | 1.2.0 | <=1.4.1 | 1.4.2 | Prisma tooling validation; website forms use Zod. Updated through patched parent. |
| zod | Direct / high | 4.4.3 | <4.6.6 | 4.6.7 | Validates public forms and admin/internal input. Collection/resource-consumption protection merits same-major patching. |

Every original finding is resolved in the installed/locked graph. No forced overrides or `npm audit fix --force` were used. No major framework migration was made.

## Updates and compatibility

- Next.js 16.2.6 → 16.4.6; matching bundle analyzer pinned at 16.4.6. Peer ranges accept the unchanged React/React DOM 19.2.6.
- NextAuth beta.31 → beta.32; Auth Prisma adapter 2.11.2 → 2.11.3; shared core resolves to 0.41.3.
- Prisma CLI, Client and pg adapter 7.8.0 → 7.10.1 as an aligned family. No schema changes. The advertised Prisma 8 release candidate was not adopted.
- Zod 4.4.3 → 4.6.7, preserving current strict schemas/validation APIs.
- tsx 4.21.0 → 4.23.15 resolves esbuild 0.28.2. This also fixes a low-severity Windows development-server advisory discovered by the full audit during updates; that extra finding was not in the original production-only 19.
- Browser mapping resolves to 2.11.37 through a targeted in-range update. Other patched transitives are resolved by compatible parent updates.
- Node 24.18.1 and TypeScript 6.0.3 satisfy reviewed engines/peers. `npm ls --omit=dev --depth=0` exits 0.

Primary release references: [Next 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6), [Prisma 7.10.1](https://github.com/prisma/orm/releases/tag/7.10.1), [NextAuth beta.32](https://github.com/nextauthjs/next-auth/releases/tag/next-auth%405.0.0-beta.32). Installed metadata and final audits were checked as well as release availability.

## Redirect security

`lib/adminRedirect.ts` parses the base and destination, compares exact URL origins (scheme/host/port), rejects userinfo, malformed URLs, control characters, whitespace, protocol-relative URLs and backslashes, and restricts destinations to the `/admin` path boundary. Login destinations fall back to `/admin`. Valid internal paths preserve query strings/fragments; normal local HTTP development remains supported. `lib/auth.ts` uses the helper directly in the NextAuth callback. Invalid base URLs return a safe relative `/admin` fallback.

Tests cover legitimate same-origin URLs, lookalike domains, userinfo tricks, external URLs, protocol/port mismatches, malformed URLs, login loops, traversal, path-prefix lookalikes and actual callback wiring. The real configured Credentials authorize callback is exercised with bcrypt for valid credentials, wrong passwords, disabled accounts and unknown roles, followed by JWT/session callbacks. This is not a full browser login test.

## Generated output and build compatibility

Prisma regeneration updates embedded compiler output. To keep generated artifacts out of this checkpoint, `lib/generated/prisma/` and `next-env.d.ts` are removed from Git tracking only; their local files remain. `npm install`/`npm ci` generate Prisma via `postinstall`. Production builds use `scripts/build-next.mjs` to generate Prisma before Next, including builds through the isolated runners. Build jobs must install build dependencies. If install scripts are disabled, generation still occurs in the build wrapper. No handwritten source, schema or migration is removed.

Next 16.4 generates an additional root-params type declaration. The metadata preservation helper now recognizes it while still refusing unrelated concurrent edits; its regression test covers both imports. Normal/test build outputs remain separate. The documented `agentRules: false` option disables new Next development-server instruction-file generation. The briefly generated AGENTS.md contained only Next's managed block; Next removes that generated block/file itself on reload. No user-authored instructions were removed.

README describes the new generation policy. No `.next`, `.local`, native compiler binary, embedded generated Prisma compiler output, upload or secret is included in the checkpoint.

## Verification

| Check | Final result |
|---|---|
| All Employee tests | 28 passed, 0 failed/skipped |
| Separate repeat of publication policy | 3 passed, 0 failed/skipped |
| Existing authorization/security regressions | 9 passed |
| New redirect/configuration regressions | 2 passed |
| Persistence/UI tests | 8 passed |
| Legacy opt-in owner-development HTTP/account-lock probes | 3 skipped |
| TypeScript, no emit/incremental cache | Passed |
| npm run postinstall | Passed; Prisma 7.10.1 generated |
| npm run build | Passed; Next 16.4.6, 59 pages |
| npm audit --omit=dev | Passed; 0 vulnerabilities |
| npm audit, including dev | Passed; 0 vulnerabilities |
| npm ls --omit=dev --depth=0 | Passed |

Unique required-test total: **47 passed, zero failed, 3 skipped**, plus the separately reported 3-test repeat. Existing opt-in owner-target tests were not enabled because owner verification remains read-only.

The first Employee invocation found its disposable server stopped (`ECONNREFUSED`), so that invocation executed no Employee tests. After verifying its directory/version/startup identity, only that disposable server was restarted without reinitialization. The subsequent full suite/repeat passed. Initial Next type-metadata warnings led to the preservation-helper update. The deliberate unrelated-edit fixture still emits its expected protection warning; final real wrapped builds succeed.

Targets: EID-03 `eid03_7d37bfe04943`, loopback 55279; DATA-02 `data02_5e318ee832ee`, loopback 63561. Runners verify provenance before commands. Mutations and outage/recovery tests affect only disposable data and isolated uploads.

Commands executed from the project root include:

```powershell
node scripts/eid03-disposable.mjs run node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/employees/domainServices.test.mjs tests/employees/eid03Bootstrap.test.mjs tests/employees/identifiers.test.mjs tests/employees/lifecycleAlignment.test.mjs tests/employees/publicationPolicy.test.mjs tests/employees/schemaIntegrity.test.mjs
node scripts/data02-disposable.mjs run node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/persistence/persistence.test.mjs tests/persistence/settingsUI.test.mjs tests/security/adminAuthorization.test.mjs tests/security/adminRedirect.test.mjs tests/security/httpSmoke.test.mjs tests/security/postgresLock.test.mjs
node scripts/data02-disposable.mjs run node node_modules/typescript/bin/tsc --noEmit --incremental false
npm audit --omit=dev
```

The actual npm build/postinstall/audit invocations used the provenance-checked DATA-02 runner with its disposable DATABASE_URL override. The normal production build script now generates Prisma explicitly before building. No lint success is claimed; the pre-existing `next lint` command is incompatible with Next 16 and was not changed here.

## Preservation and limitations

Read-only before/after fingerprints match all rows/counts in all 18 owner public tables. `.env` and all four original uploads are byte-identical. Local development is restored with `npm run dev:local` and the existing persistent database. No credential changes, migrations, seeds or resets were performed against the owner database. No production/DNS/Cloudflare resources or GitHub refs were modified.

Zero audit findings is not proof of complete application security. NextAuth remains on its existing v5 prerelease line. Workers runtime compatibility, native Sharp in a Worker bundle, production database/media provisioning, upload abuse protection and PDF error-response sanitization remain separate preflight/security work. No production-readiness or Cloudflare deployment claim is made.

## Files and checkpoint

Created: `lib/adminRedirect.ts`, `tests/security/adminRedirect.test.mjs`, `scripts/build-next.mjs`, and this report.

Modified: `lib/auth.ts`, `tests/employees/publicationPolicy.test.mjs`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`, `next.config.mjs`, `scripts/build-isolation.mjs`, `scripts/eid02b-disposable.mjs`, and `tests/persistence/persistence.test.mjs`.

Generated Prisma output and `next-env.d.ts` are untracked without deleting local files. No Prisma schema or migration edits. Branch: `main`. Commit message: `fix(deploy-04a): stabilize employee tests and address security findings`. The final response records the local hash and clean-tree verification after commit.

GitHub push: **NOT PERFORMED**. Cloudflare deployment: **NOT PERFORMED**.
