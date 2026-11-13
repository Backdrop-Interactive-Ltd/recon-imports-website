# LAUNCH-05D: restricted-role security rehearsal

Prepared 2026-11-14 from local main at 1761aeb7289dea81e49e242153b94e933b7c2a1a, following LAUNCH-04/05A/05B/05C. The SQL is prepared for later review and was executed **only in a new local PostgreSQL 17.11 cluster**. No production connection, role/grant change, migration/import, existing credential/environment edit, upload modification, push, deployment or DNS action is part of this task.

## Confirmed risk and selected scope

LAUNCH-05C's sanitized live catalog evidence shows that postgres-created public tables default to granting anon/authenticated/service_role SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN; sequences grant USAGE/SELECT/UPDATE; functions receive EXECUTE, including implicit PUBLIC execution. Public was empty, and the owner confirmed Data API OFF. This is latent future-object access, not evidence of exposed owner records.

The selected approach uses **recon_migrator** for application ownership/DDL/import and **recon_runtime** for Prisma/Hyperdrive. Defaults belong to the actual object creator, so all twelve migrations must run as recon_migrator. Do not run them as postgres and assume inheritance copies the restricted defaults. PostgreSQL distinguishes global defaults from per-schema additions; a schema-only revoke cannot remove global PUBLIC function execution. [PostgreSQL 17 default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

The procedure leaves postgres/supabase_admin defaults, provider-role membership, auth/storage/extensions objects, platform functions, event triggers, database PUBLIC CONNECT/TEMP privileges and API control-plane settings unchanged. It neither grants blanket public-schema object access nor revokes privileges across every object in public. Existing unexpected RECON-role powers/membership, runtime ownership, external table grants, table ownership or RLS cause an abort rather than silent repair.

## SQL phases (not Prisma migrations)

Each file requires a caller-owned transaction, a verified target connection and a transaction-local `recon.hardening_target` equal to the approved database name. The marker is an accident-prevention guard, not an authorization substitute. Never set it from an unknown target automatically. None of the files contains a password or activates LOGIN. Existing credentials/LOGIN state are preserved when rerunning.

| File | Actor and behavior |
| --- | --- |
| scripts/sql/launch05d/01-roles.sql | Approved provisioning operator creates missing dedicated roles as NOLOGIN/NOINHERIT/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS, checks existing roles, grants CONNECT and public USAGE; only migrator gets public CREATE. Sets database-scoped trusted search paths. Does not grant membership to runtime. |
| scripts/sql/launch05d/02-creator-defaults.sql | Authenticated recon_migrator revokes global and public-scoped default table/sequence/function/type privileges from PUBLIC, API principals and runtime. Future objects start private; runtime gets no automatic rights to a newly introduced model. |
| scripts/sql/launch05d/03-runtime-grants.sql | After all twelve migrations, recon_migrator verifies exact ownership and absence of unreviewed RLS, revokes API/PUBLIC/runtime rights on an explicit allowlist of 24 tables, two sequences, five guard functions and 18 enums, then grants the reviewed runtime matrix. All changes are transaction-scoped; it does not disable RLS or rewrite application guards. |

The existing built-in PUBLIC TEMP allowance is not globally revoked because doing so could affect provider sessions. The verified runtime restriction is **no permanent application/schema/database DDL or ownership**, not an assertion that PostgreSQL denies every possible temporary object. Runtime must remain a private server credential; this does not replace application authorization or SQL-injection defenses.

## Runtime matrix and tested behavior

| Objects | Allowance |
| --- | --- |
| AdminUser; Brand; VehicleCategory; Car; HeroSlide; SellCarLead; RequirementLead; AuctionSheetRequest; NewsletterSubscriber | SELECT/INSERT/UPDATE/DELETE |
| CarImage; CarFeature; Media | SELECT/INSERT/DELETE |
| SiteSetting; Department; Employee; EmployeePublicProfile; EmployeeVerificationIdentity; EmployeePublicationApproval | SELECT/INSERT/UPDATE |
| EmployeeAuditEvent | SELECT/INSERT only |
| Official employee sequence | USAGE/SELECT, not UPDATE/setval |
| Eighteen application enums | USAGE |
| Legacy employee sequence; _prisma_migrations; Account/User/Session/VerificationToken; guard functions | No runtime grant |

Real PostgreSQL tests verified permanent DDL/role escalation, ledger DELETE, audit mutation, sequence reset, migration-history reads and ungranted future-object access are denied. API tests actually SET ROLE to each synthetic anon/authenticated/service_role principal; all RECON table privileges and canary table/function/sequence access are denied, including service_role with BYPASSRLS. Intended provider sentinel SELECT/function execution remains allowed.

Real Prisma runtime CRUD covered inventory and child collections, categories, homepage slides, media, settings upserts, lead/auction/newsletter records. The actual account-safety helper serialized concurrent last-super-admin demotions: one committed, one rolled back, without ownership or TRUNCATE. Runtime admin deletion retained only the permitted foreign-key cleanup in immutable employee audit/approval history. Trigger protections continued working without exposing guard-function EXECUTE.

All 28 existing employee tests ran against the pre-provisioned restricted role, exercising publication eligibility, resignation/rejoin, consent withdrawal, immutable identities, audit rollback, race protection and legacy migration compatibility. Test fixtures were adjusted to use the configured runtime-role identifier and skip automatic grants in this explicitly marked rehearsal. A compatibility schema was pre-created by the disposable operator instead of giving the migration role database-wide CREATE. Existing default fixture behavior remains available; application code was not changed.

The local production Next.js server used recon_runtime. Its HTTP test verified actual Credentials login, JWT session, logout, twelve protected admin pages, five existing public pages, DB-authoritative role checks and immediate denial after account deactivation. No employee UI route was invented or assumed. These are local HTTP checks, not browser or deployed Hyperdrive tests.

## Reproduction, isolation and evidence

```powershell
node scripts/launch05d-rehearsal.mjs
node --test tests/security/launch05d.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The runner reuses the vendor-checksummed PostgreSQL 17.11 binaries installed for LAUNCH-05B and existing Git OpenSSL. It creates a fresh ACL-protected, Git-ignored `.local/launch05d/<timestamp>-rehearsal-<nonce>/` cluster, new random test credentials, two named databases, synthetic API/provider fixtures and a short-lived self-signed loopback TLS certificate. No installer/service, global certificate trust or application environment changes occur. New server connections require TLS; Node uses verified CA/hostname trust and Prisma's native migration connection uses strict certificate acceptance. The original local PostgreSQL connection retains its existing configuration and is used read-only.

Host, random database/port, nonce marker, role, cluster directory, server 17.11 and TLS authorization are checked before writes. HBA rejects unrelated database connections. Supabase-like provisioning is exercised by a nonsuperuser operator with the relevant administration privileges; recon_migrator has public CREATE but is not the database owner. TLS keys, bootstrap secret, logs, copied candidate records and fingerprints stay private and outside Git. Only the new PostgreSQL and local HTTP servers are stopped after verification.

All twelve immutable migrations and checksums passed on both empty targets; migrate deploy retry was a no-op and Prisma schema diff was empty. All three hardening phases ran twice. Provider object/default ACL snapshots were unchanged; application grants were compared across repeated final hardening. These checks model stock PostgreSQL roles/defaults and provider sentinels, not actual Supabase event-trigger bodies.

The isolated candidate target received the same 31 local candidate rows (1 admin, 27 settings, 3 referenced media) as LAUNCH-05B. Original IDs, bcrypt hash, fields/timestamps and media references were preserved without printing them. An invalid late row rolled back the entire import; a second exact import skipped 31 rows; a conflicting setting aborted. Historical media, owner sessions, provider data and source migration-history rows were excluded. Production publication approval and real Cloudinary mapping remain separate.

The initial broader-suite attempt exposed hardcoded old runtime-role names in test permission-fault injection, causing cleanup to fail. The helpers now use a validated configured role and close connections even if restoration fails. This was a test-harness correction, not a grant expansion or weakened business check. Failed-run private evidence was retained and its server stopped.

**Final run: VERIFIED**, private report `.local/launch05d/20261113231545129-rehearsal-1f99b2a7/result.json`. Both targets passed twelve matching migrations, empty Prisma diffs, unchanged provider ACL/default snapshots and unchanged application ACLs after repeating the final hardening phase. Six real runtime/API permission tests, 28 employee tests, one real HTTP authentication test and 31 security/UI/static-safety regressions passed: **66 tests, zero failures/skips in the final checks**. TypeScript, JavaScript syntax and the standard production build under recon_runtime passed. Actual Supabase/Hyperdrive or Workers deployment tests were not performed.

All 18 original owner table/schema fingerprints, environment/upload/migration files and both verified archive checksums matched before/after. The original database still has ten migrations; neither pending employee migration was applied there. Rehearsal PostgreSQL/HTTP servers are stopped and private evidence is retained. No owner write or production connection occurred.

Files created: this report; scripts/launch05d-rehearsal.mjs; the three scripts/sql/launch05d files above; tests/deployment/launch05dContext.mjs, launch05dRuntime.test.mjs and launch05dHttp.test.mjs; tests/security/launch05d.test.mjs. Files modified: scripts/launch05a-common.mjs (private scope only), and five existing employee test helpers/suites: fixture, domainServices, lifecycleAlignment, eid03Bootstrap and schemaIntegrity. No application source, schema, migration history file, dependency or environment file changed.

## Exact future production order and approvals

1. Owner separately approves the three SQL files, exact reserved role names, migration/import scope, credential-provisioning method and maintenance window. Confirm Data API is still OFF; refresh a verified local backup and confirm production backup/PITR/recovery access. Recheck production project/TLS/freshness against LAUNCH-05C; stop on unexpected roles or objects. Existing privileged credentials must not be copied into runtime bindings.
2. Capture private before-images of relevant role attributes/memberships/settings, default/object ACLs, ownership and provider state. Run 01 as the approved provisioning operator inside a pinned transaction. If an existing dedicated role is unexpected, stop rather than overwrite its credentials or memberships.
3. In a separately authorized secure credential step, activate only the new role logins and inject passwords through a protected interactive/secret-manager channel; no SQL source, shell URL, environment file, transcript or Git secret. This task changed only newly created disposable test credentials, not any existing local/production credential. Verify actual migration/runtime logins over strict TLS.
4. Connect directly or through Session Pooler as recon_migrator. Run 02 in a pinned transaction and inspect effective future-object grants. Run pinned Prisma 7.10.1 migrate status/deploy/status for the original twelve files. No seed, db push, migrate dev, reset, wrapper added to immutable files or copying source history. Prisma 7 migrations are not one all-or-nothing batch; inspect partial state on any failure.
5. Verify twelve finished checksums, all 23 application tables plus migration metadata, SQL-only indexes/constraints/guards/sequences and effective owners/RLS flags. Run 03 as the migration owner in one pinned transaction. If Supabase's managed event triggers enable RLS or change permissions, stop for a reviewed policy/grant decision; never bypass the guard or disable platform controls blindly. Re-run role/API denial and read-only runtime checks on the actual target. Actual Supabase execution remains separately authorized and untested.
6. Approve persistent Cloudinary delivery and the exact private owner record manifest, then use a separately reviewed, production-pinned importer as the operator/migration role. Rehearsal scripts intentionally reject production. Import approved transformed rows atomically with a cooperative mutex, exact-match idempotency, conflict aborts and canonical checks. Do not give runtime access to migration metadata merely to perform import.
7. Only after data, media, login/account-lock/employee checks and a protected target backup pass, separately approve Hyperdrive configuration with the restricted runtime credential, direct Supabase origin, verified TLS and query caching disabled. Keep any Worker DATABASE_URL fallback equally restricted. Hyperdrive resource configuration, credential cutover, push, deployment and DNS are outside this task.

## Rollback boundaries

- Each SQL phase runs inside a caller-owned transaction; its failure rolls back that phase. Earlier committed phases and prior Prisma migrations remain. Capture before-images before the first write; never assume all twelve DDL files roll back together.
- If hardening rejects ownership/RLS/unexpected-role state, leave defaults private and stop before import. Resolve through an approved narrow forward repair. Do not grant ALL/PUBLIC access, remove guards, reset public or alter managed schemas to force success.
- If provisioning was newly introduced and no cutover occurred, roles may remain NOLOGIN/unused for review. Disabling a newly activated runtime login or restoring exact prior ACLs requires separate approval. Do not drop owning roles or rewrite ownership/history automatically. Never restore provider defaults from a local simulator.
- Import rollback covers its transaction only. Retain successful Cloudinary assets/mappings if a later step fails. After committed owner writes, recovery must preserve/reconcile new records and employee revocations; no destructive blanket rollback or reuse of identity codes.

## Remaining production gates

The local permission/Prisma rehearsal can pass while production execution remains unapproved. Required next gates are actual Supabase provisioning/migration authorization, secure new-role credentials, managed-trigger/RLS/default-grant rechecks, production backup/PITR confirmation, approved Cloudinary URLs and payload, and real Hyperdrive origin/role/TLS/cache verification. No production hardening is claimed by this report.
