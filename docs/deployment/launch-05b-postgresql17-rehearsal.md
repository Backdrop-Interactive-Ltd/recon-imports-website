# LAUNCH-05B: PostgreSQL 17 migration and candidate-transfer rehearsal

This is an isolated local rehearsal of the LAUNCH-04 plan, following the verified LAUNCH-05A backup and read-only Supabase report. It does not authorize production writes. No Supabase connection, owner-database write, upload change, environment-file edit, push, deployment or DNS operation is part of the runner.

## Reproduction and isolation

The runner uses the exact PostgreSQL **17.11** reported by Supabase in LAUNCH-05A. EDB's binary ZIP is linked by the [PostgreSQL Windows download page](https://www.postgresql.org/download/windows/). Archive `postgresql-17.11-4-windows-x64-binaries.zip` comes from `https://get.enterprisedb.com/postgresql/`; its SHA-256 must match the [vendor-published checksum](https://github.com/EnterpriseDB/edb-installers/issues/706): `b9424ee7bc60b52450ff910a3630225df32e633f3cb29c1d126d9299d59aea28`.

Extract the verified archive under `%LOCALAPPDATA%/ReconImports/PostgreSQL-17.11-rehearsal/`, retaining `pgsql/bin` and its DLL/share layout. This is a separate binary installation, not a replacement Windows service or owner cluster. No application dependency changes are required.

```powershell
node scripts/launch05b-rehearsal.mjs
node --test tests/security/launch05b.test.mjs
```

Every invocation creates a fresh ACL-protected, Git-ignored `.local/launch05b/<timestamp>-<nonce>/` directory and a new loopback-only PostgreSQL cluster. New random credentials, non-overlapping port, random database names and database provenance comments are verified before writes or Prisma child processes. HBA rules restrict migration/runtime roles to the two explicitly named rehearsal databases and reject connections to postgres or any other database. The migration role is not a superuser and cannot create databases/roles or bypass RLS. Only the bootstrap connection initializes that new cluster. Only that server is stopped afterward. Logs and database files remain private; no candidate row payload, password or admin hash is printed.

The source is pinned to the existing `recon_local`, loopback port 54329, expected project data directory and PostgreSQL 18. Source queries use read-only transactions. All owner table fingerprints, environment/upload/migration files and both LAUNCH-05A verified archives are checked before and after. No PostgreSQL 18 dump is restored into PostgreSQL 17.

Prisma 7.10.1 runs `migrate deploy` and `migrate status` against the new empty target, with DATABASE_URL overridden only in each short-lived child environment. Original migration files remain immutable; no seed, db push, reset or migrate dev is used. A local synthetic auth-schema sentinel checks that unqualified migrations leave unrelated provider-style schemas intact; it does not reproduce Supabase services.

## Verification scope

The runner checks all twelve ordered migration checksums and finished states; expected public tables; Prisma schema diff; validated constraints/foreign keys; indexes; five enabled guard triggers/functions; and both employee sequences without consuming allocations. Prisma's diff omits unsupported expression/partial indexes and SQL guards: the four deliberate SQL-only indexes and the guards are verified separately in catalogs and real database tests. Never use a schema-only diff to replace the reviewed migrations.

Candidate scope is one active SUPER_ADMIN, all 27 SiteSetting rows, and the three Media rows referenced by websiteLogo/footerLogo/favicon. The fourth, historical/unreferenced Media row is excluded. IDs, timestamps, fields and bcrypt passwordHash are preserved exactly by parameterized, typed JSON-to-record inserts. Source data stays in memory; the private manifest contains IDs and fingerprints. This local rehearsal does not constitute production publication approval.

Transfer checks include an intentional late-row failure proving transaction rollback, a successful import, a second import skipping exact matches, rejection of conflicting values without overwriting them, exact canonical row comparison, empty unrelated application tables, and untouched migration history/employee sequences. Local image references must exist and remain unchanged. Existing employee tests run against a second fresh, synthetic-only PostgreSQL 17 database; owner records are not used as fixtures.

## Execution results: 2026-11-14

**PASS.** Successful private evidence is retained at `.local/launch05b/20261113222130727-b821fbae/result.json`, with schema evidence, migration/build/test logs and a private candidate manifest. The PostgreSQL 17 server was stopped after verification; no service or persistent startup configuration was installed. Both original LAUNCH-05A backup checksums still match.

| Migration | Result |
| --- | --- |
| 20260513180300_init_car_showroom_cms | Applied; checksum matches |
| 20260513181548_add_admin_auth | Applied; checksum matches |
| 20260514055000_add_reviewed_lead_status | Applied; checksum matches |
| 20260514111424_add_auction_sheet_manual_payment | Applied; checksum matches |
| 20260514112532_add_media_library | Applied; checksum matches |
| 20260518050617_extend_vehicle_categories_for_homepage | Applied; checksum matches |
| 20260520060326_add_car_youtube_video_url | Applied; checksum matches |
| 20260520075539_add_car_wheel_size | Applied; checksum matches |
| 20260520104934_add_car_sale_status | Applied; checksum matches |
| 20260521045616_add_car_chassis_number | Applied; checksum matches |
| 20261113143000_add_employee_identity | Applied; checksum matches |
| 20261113180000_align_employee_lifecycle | Applied; checksum matches |

All twelve entries finished successfully in order, with no failed or rolled-back entries. A second migrate deploy is a no-op. Prisma reports an empty schema diff. Public contains 23 application tables plus migration metadata, 92 indexes and 44 validated constraints (15 foreign keys, six checks); five guard functions/triggers are present and enabled. Both allocation sequences retain their initial unconsumed values, 1 and 101, on the candidate-transfer database. No migration or application-code change is required by the tested PostgreSQL 17 engine behavior.

Transfer result: **31 exact rows** (1 admin, 27 settings, 3 referenced media); a second import inserts zero and skips 31 matches. The active SUPER_ADMIN ID, email/name, passwordHash, role/active flag, all settings, media metadata and timestamps remain exact without printing them. A deliberately invalid last Media row rolled back the earlier inserts; a changed setting value was rejected without overwriting target records. All unrelated application tables remain empty. The synthetic auth-schema sentinel remained unchanged. Local media URLs/files were preserved; no Cloudinary mapping or transfer is claimed.

Executed checks:

- `node scripts/launch05b-rehearsal.mjs`: passed real initialization, twelve migrations/status/retry, schema/catalog checks, transfer/rollback/retry/conflict checks, and source/file/backup preservation.
- All seven existing employee test files: **28 passed, 0 failed/skipped**, using the second fresh PostgreSQL 17 database and restricted runtime role.
- Target-safety, LAUNCH-05A, admin authorization/redirect, Workers compatibility and settings UI regressions: **21 passed, 0 failed/skipped**, using `node --import tsx --experimental-vm-modules --test --test-concurrency=1` with the six selected test files.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- Standard `scripts/build-next.mjs` (Prisma generate and Next production build): passed against the isolated PostgreSQL 17 candidate database with read-only connection defaults, synthetic AUTH_SECRET and the existing isolated build directory/metadata-preservation helper. No Workers deployment/build or live Supabase runtime test is claimed.
- JavaScript syntax and staged diff/secret-exclusion review: passed before the local commit.

During runner development, the first assertion expected Prisma to enumerate unsupported SQL-only indexes; the observed empty diff led to correcting that test assumption. A second run caught overly broad disposable HBA access in the existing isolation test; rules were restricted to the named test databases. The final fresh run passed the full suite. These were rehearsal-harness corrections, not production migration changes. Failed-run evidence is retained privately and those servers are stopped.

All 18 original PostgreSQL 18 tables and their schema/data fingerprints remain unchanged, with the original ten migration rows and two pending employee migrations. Environment files, original uploads, every migration file and both verified archives remained byte-identical. Supabase connections/writes in this task: **zero**. Existing backups were not restored into PostgreSQL 17 or removed.

## Supabase differences and production gates

Stock local PostgreSQL validates engine/SQL/Prisma compatibility, not Supabase's managed roles, extensions, event triggers, default privileges, Data API, RLS, TLS or Session Pooler behavior. LAUNCH-05A independently verified TLS/read-only Session Pooler connectivity and public schema privileges on Supabase 17.11. Production migration execution remains untested. No Supabase service or Hyperdrive connection is exercised by this rehearsal.

Before production writes, approve the exact admin/settings/media allowlist, confirm the target remains fresh, provision a dedicated migration role and restricted runtime role, review default grants/Data API exposure, and establish backup/PITR recovery. Local `/uploads/` references are intentionally preserved here and remain unsuitable for Workers production until an approved persistent-media mapping exists. Do not copy Supabase managed schemas, local database roles, sessions, test fixtures or source `_prisma_migrations` rows.

## Concise future production sequence

1. Separately authorize the migration/import scope; refresh the protected local backup and private approved payload, verify target identity/freshness with strict TLS and establish reviewed roles/API protections.
2. Inject only the verified target credential into a short-lived Prisma process; use a direct or Session Pooler connection, run migrate status/deploy/status, and require twelve finished matching migrations. Do not run the admin seed or edit migration checksums.
3. Check 23 application tables plus migration metadata, foreign keys/checks, custom indexes, five guards and both sequences. Verify runtime grants and anonymous/API denials before private data is imported. Abort on unexpected objects/history or partial migration state.
4. Complete the separately approved media upload/mapping, then import the approved typed rows atomically, preserving all fields except explicitly approved target URLs. Exact-match retries may skip rows; conflicts abort rather than overwrite owner edits. Verify canonical data, media URLs and admin access through separately authorized runtime checks.
5. Retain backups/manifests, take a protected post-import target backup, and review results before any cutover. A failed import rolls back; a failed migration requires state inspection and an approved forward-repair plan, never a production reset. Push/deployment/DNS remain separate tasks.
