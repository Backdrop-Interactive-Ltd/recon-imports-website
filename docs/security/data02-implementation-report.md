# DATA-02 — permanent local development persistence

Date: 2026-11-13. Final status: **COMPLETE** within the authorized local scope.

## 1. Root cause resolution

The persistent database had stopped after an interrupted shutdown. Next.js alone continued rendering default branding because the public settings loader catches database failures. Saved data was present when the existing cluster was restored. No owner settings repair or replacement was needed.

Added `npm run dev:local`, which verifies/starts the existing PostgreSQL cluster, verifies database readiness and identity, then starts Next.js. Public fallback behavior remains available. Admin settings no longer convert a failed database load into an editable defaults form.

## 2. Database availability

Existing owner target: `recon_local`, `127.0.0.1:54329`, persistent directory `.local/postgres`, PostgreSQL 18.6. Before startup, checked environment target, cluster version/control/base files, previous startup path/port, and stale PID state. The previous PID was not live. PostgreSQL performed its normal interrupted-shutdown recovery and became ready.

`scripts/local-database.mjs` refuses missing/incomplete clusters, wrong target, mismatched identity, live-but-unavailable PID state, invalid credentials and unsupported binary platform. It never calls initdb, creates a database, applies migrations, seeds, or updates application records. A readiness query verifies current database, server port and actual data directory using a read-only connection. Repeated checks reused the same owner PostgreSQL process rather than starting duplicates. Other PostgreSQL instances were not stopped.

The initial startup log location inside the cluster caused a temporary Windows sharing-lock delay during recovery. Recovery completed normally. The final helper puts future startup logs outside the cluster at `.local/postgres-startup.log` and uses pg_ctl without inherited pipe handles. No cluster files or old log files were manually removed.

## 3. Existing saved logo/favicon verification

Read-only queries found 27 SiteSetting rows. Saved references were:

- Website logo: `/uploads/media/f527c5f9-c0a5-4f78-afa8-e1f01cad32d3.png`
- Favicon: `/uploads/media/cf081777-b232-4e62-b7b8-5513f1dd57fb.png`
- Footer logo: `/uploads/media/8ed43ca3-2a50-4311-9dbf-476744986599.png`

All referenced files exist. After restarting the real local Next.js server with the new command, the homepage returned HTTP 200 and included the saved logo and favicon URL. No owner setting was updated during this task.

## 4. Files modified and created

Modified application/source files:

- `package.json`: adds `dev:local`; existing `dev` retained.
- `scripts/local-db.mjs`: safe existing-cluster verification/start entry point, replacing automatic initialization/database creation.
- `lib/siteSettings.ts`: strict admin loader; public fallback retained.
- `app/admin/(dashboard)/site-settings/page.tsx`: no editable form on failed load.
- `app/admin/(dashboard)/site-settings/actions.ts`: safe unconfirmed-save error on transaction failure.
- `app/admin/(dashboard)/site-settings/SiteSettingsForm.tsx`: upload-aware save blocking and synchronous submit guard.
- `app/admin/(dashboard)/_components/AdminImageUpload.tsx`: upload lifecycle callback, disable support, and upload-versus-save wording.
- `lib/adminAuthorization.ts`: database-unavailable page authorization redirects to a clear login error state; permission rules unchanged.
- `app/admin/(auth)/login/AdminLoginForm.tsx`: database-unavailable explanation.
- `lib/siteSettingsConfig.ts`: valid fallback favicon reference.
- `next.config.mjs`: isolated distDir only when an explicit recognized test-build task is selected; normal output stays `.next`.
- `scripts/eid02b-disposable.mjs`: shared isolated output/type-metadata preservation and fresh DATA-02 target support. EID-03 inherits this through its existing wrapper.
- `tests/security/moduleHarness.mjs`: optional explicit global boundaries for UI tests; defaults unchanged.
- `.gitignore`: environment variants, backup/dump directories and common secret/database files.
- `README.md`: new startup, persistence, storage and owner-operated Git instructions.

Created:

- `scripts/local-database.mjs`
- `scripts/dev-local.mjs`
- `scripts/build-isolation.mjs`
- `scripts/data02-disposable.mjs`
- `public/favicon.svg`
- `app/admin/(dashboard)/site-settings/error.tsx`
- `tests/persistence/worker.mjs`
- `tests/persistence/persistence.test.mjs`
- `tests/persistence/settingsUI.test.mjs`
- `docs/security/data02-implementation-report.md`

Next-generated TypeScript configuration/declaration changes were normalized back to the normal development references. The final isolated build's before/after byte checks show `tsconfig.json` and `next-env.d.ts` unchanged by that build. Ignored test manifests, snapshots, synthetic uploads and isolated build files were created under `.local/`. No environment file, schema, migration, seed, production configuration value, dependency lockfile, or owner upload was changed. No dependencies were installed.

## 5. New local startup command

```powershell
npm run dev:local
```

Run from the project directory after closing VS Code, restarting a terminal or restarting the computer. PostgreSQL's data remains in `.local/postgres`; existing upload files remain in `public/uploads`. The command starts the database when necessary; no Windows login/startup service was installed.

`npm run db:local` now starts/verifies the existing database and returns. `npm run dev` still starts only Next.js. A new checkout with no cluster deliberately fails instead of initializing a replacement database: restore a verified backup or separately authorize provisioning. The current website remains running at `http://localhost:3000` through `dev:local`.

## 6. Admin Settings protection

`getAdminSiteSettings()` throws a sanitized error on database failure. The settings page returns an alert/reload link without a form; it never passes outage fallback values to the editor. Public `getSiteSettings()` retains its existing fallback behavior.

The form tracks each image uploader independently. Both its disabled Save button and an immediate ref-backed submit guard prevent saving during any pending upload, including before React rerenders. Upload controls cannot begin another upload during a pending save. Upload completion says to save the form; settings-save confirmation is separate.

Database authorization still uses current DB-backed EID-01 permissions. An authorization outage redirects to an explanatory login state. A scoped error boundary handles failed settings operations; transaction errors advise reloading saved settings before retrying. A lost commit response can be ambiguous, so errors do not claim that a save definitely could not have committed.

## 7. Upload persistence behavior

Normal development uploads retain the same UUID-based `/uploads/...` references and physical `public/uploads` location. Nothing moves or deletes existing assets. Cloudinary configuration was not changed. Local storage is separate from Git and needs backups along with database references.

Mutation tests redirect only the upload filesystem boundary to `.local/data02/5e318ee832ee/isolated-uploads`. The real upload route, validation, Sharp encoding and media-record logic execute against synthetic inputs and the disposable database. No test upload is written to the owner's `public/uploads` directory.

## 8. Favicon fix

Added bundled `public/favicon.svg` and changed the default URL to `/favicon.svg`. An HTTP GET returned 200. Saved favicon settings continue to take priority: the actual homepage uses the saved uploaded PNG. The formerly missing default favicon is no longer referenced by the application fallback. Old image files were not deleted.

## 9. Disposable build isolation

Recognized test builds select `.local/builds/eid02b`, `.local/builds/eid03`, or `.local/builds/data02`. Arbitrary task/path input is rejected. The shared runner passes the task only to its child process and does not change `.env` or the parent shell.

Next 16 also edits root type metadata. The runner snapshots it before build and restores only recognized generated changes after completion. Unexpected concurrent edits are left for review rather than overwritten. A test deliberately exercises this refusal and emits the expected warning.

An actual isolated production build succeeded. Before/after SHA-256 comparisons verified these normal files remained byte-identical:

- `.next/BUILD_ID`
- `.next/server/app/index.html`
- `tsconfig.json`
- `next-env.d.ts`

The isolated homepage contains the synthetic test site name while the normal production artifact does not. Prior test-generated normal build artifacts from earlier tasks were not deleted or replaced. Build normally against the intended verified target before using `npm start`; continue using `dev:local` for this local workspace.

## 10. Tests performed

Fresh disposable target: `data02_5e318ee832ee`, loopback port `63561`, new independent PostgreSQL cluster and random credentials. Provenance/marker verified by the runner and tests. Owner/runtime roles have no superuser/database-creation/role-creation/replication privileges; HBA restricts them to that database. Existing role labels are reused in the separate cluster, not credentials or connections.

Commands executed:

```powershell
node scripts/data02-disposable.mjs init
node scripts/data02-disposable.mjs run prisma migrate deploy
node scripts/data02-disposable.mjs run node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/persistence/persistence.test.mjs tests/persistence/settingsUI.test.mjs
node scripts/data02-disposable.mjs run node --import tsx --experimental-vm-modules --test tests/security/adminAuthorization.test.mjs tests/security/postgresLock.test.mjs tests/security/httpSmoke.test.mjs
node scripts/data02-disposable.mjs run node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/data02-disposable.mjs run build
node scripts/local-db.mjs
node scripts/local-db.mjs
npm run dev:local
```

Results:

- Persistence/UI tests: **8 passed, 0 failed**.
- Existing authorization/security regressions: **9 passed, 0 failed, 3 skipped**. The opt-in existing-development HTTP/lock probes remain disabled to preserve read-only owner verification.
- TypeScript: passed.
- Next 16.2.6 production build: passed; 59 pages generated in isolated output.
- Live local homepage: 200, saved logo/favicon found after Next.js restart.
- Fallback SVG: HTTP 200.
- Repeated database startup checks: reused the running owner cluster.

The persistence integration test executes actual settings loaders, save action, authorization lookup and upload route through an HTTP worker using Prisma/PostgreSQL. It saves synthetic settings, restarts that worker, reloads, stops/restarts **only the disposable database**, verifies outage failure/recovery and confirms rows/timestamps and uploaded bytes persist. UI tests execute the actual components with controlled React/network boundaries to cover concurrent uploads and failed loading. These are not full browser/Playwright tests. A Windows inherited-pipe issue in the first test attempt was corrected in the pg_ctl process wrapper; final reruns pass.

Existing migrations were applied only to the newly provisioned disposable database to create its test schema. No migration was created, modified or applied to the owner database.

## 11. Data preservation evidence

After restoring owner availability, captured an ignored SHA-256 snapshot of all SiteSetting keys/values/updatedAt and all four original upload files. After implementation, tests, isolated build and real Next.js restart:

- Owner settings row count remains 27.
- All settings values and timestamps match the initial post-recovery snapshot.
- All four original upload files are byte-identical.
- Saved website logo/favicon render in fresh HTML.

All owner diagnostic queries used read-only database connections/transactions. Normal PostgreSQL startup/recovery writes its own internal state; no application record writes, seed, migrations, reset, upload deletion, or owner branding overwrite occurred. No claim is made that hashes inspect every unrelated business table; startup code performs no application mutations.

## 12. Remaining risks

- A physical computer power cycle was not performed. Restarted the real Next.js server; exercised application-worker and disposable-PostgreSQL restarts. Durable files plus the safe startup path support subsequent computer restarts, but backups remain necessary for hardware/storage failure.
- Full browser UI verification was unavailable; controlled component tests cover the upload race and disabled form behavior.
- PostgreSQL binaries/startup are specific to the existing Windows x64/PostgreSQL 18 installation. The helper intentionally stops for other platforms or missing clusters.
- No automatic Windows service was installed. Start the workspace using `dev:local` after reboot.
- Cloudinary remains unconfigured; uploads remain local and are not automatically synchronized between machines or deployments.
- Public defaults may still appear if the database goes down after startup. Admin editing fails closed; public fallback remains an intentional existing availability behavior.
- Normal pre-existing production build artifacts must be rebuilt against the intended database before `npm start`.
- No Git history exists for this folder, so a repository baseline diff is unavailable.

## 13. Git status

`git status --short` still reports that this is not a Git repository. No initialization, staging, commit, remote configuration or push was performed. `.gitignore` protects `.env` variants except the template, `.local`, uploads, common backups/dumps/database files and key/secret files. PostgreSQL schema/migrations remain trackable. README provides owner-operated Git/GitHub steps with staged-content review before committing.

## 14. Deployment status

Not deployed. No production/staging/shared database access, production migration, environment rewrite or Cloudinary reconfiguration. EID-04 was not started.

## 15. Final status

**COMPLETE.** Saved branding was recovered by restoring availability, verified unchanged, and observed in fresh responses after restart. Local startup, Admin Settings protections, valid fallback favicon and disposable-build isolation are implemented and tested. Stop for project-controller review.
