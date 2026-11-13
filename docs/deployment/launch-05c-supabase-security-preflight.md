# LAUNCH-05C: production database security and migration preflight

Prepared 2026-11-14. Read alongside LAUNCH-04, LAUNCH-05A and LAUNCH-05B. This task authorizes only read-only production checks and local operator tooling/documentation. It does not authorize role/grant changes, migrations, imports, media uploads, environment edits, push, deployment or DNS operations.

## Secure read-only connection

The existing LAUNCH-05A prompt now accepts a closed Task selector; its default behavior remains LAUNCH-05A. The LAUNCH-05C mode uses the same hidden password entry, memory-only stdin pipe, Unicode escaping, BSTR disposal, matching Session Pooler fields and strict certificate/hostname verification. Credentials are never passed as command-line arguments, written into application .env files, or persisted in reports. Re-entry is necessary after a completed/failed process because the password is discarded.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\launch05a-supabase-prompt.ps1 -Task LAUNCH-05C -CertificateFile <trusted-local-Supabase-CA-file>
```

The verified official CA from LAUNCH-05A remains valid and matches its recorded fingerprint. The checker accepts only Session Pooler hostnames, database postgres and port 5432; username must match the owner-supplied project reference. It additionally verifies the authenticated SQL role and a verified TLS socket. The project/host/user combination is fingerprinted privately, not printed. A read-only repeatable-read transaction contains every production query and ends with ROLLBACK. It does not test writes, locks, nextval/setval, DDL, role switching or API-key access.

Each run stores sanitized evidence under a fresh `.local/launch05c/` directory restricted to the current Windows user and SYSTEM and excluded from Git. The 14 security query groups read catalog metadata: role flags/membership, schema privileges, explicit/default ACLs, effective future-object privileges for the current creator, safe PostgREST schema-setting hints, public objects, API table privileges, RLS/policy metadata, function security flags, event triggers and extension names/versions. Role passwords, JWT settings, function bodies and private row contents are not selected. The reused baseline additionally checks target schema/record counts and RECON object collisions.

## Live target findings

The successful second probe at 04:44 Asia/Dhaka on 2026-11-14 verified **TLS 1.3**, certificate/hostname validation, the owner-supplied project/SQL-role match, database postgres, PostgreSQL **17.11**, public as the current schema, public CREATE/USAGE and PL/pgSQL USAGE. The session/transaction was read-only. Its private evidence is `.local/launch05c/20261113223940233-security-379e14e7/preflight-result.json`; the owner Dashboard attestation is recorded separately in that run's `reviewed-assessment.json`.

Public has **zero relations, functions or user-defined types**, no RECON object collisions and no Prisma migration history. No application/non-managed user records were found. Counted auth.users, storage.buckets and storage.objects are empty, without unreadable/RLS-filtered counts; other provider table contents were not inspected. Five extensions and six enabled provider event triggers exist outside the application schema. Their bodies/effects were not executed or modified.

The owner confirmed in Supabase Dashboard: **Data API OFF**, with the Settings tab stating Data API is disabled; exposed schemas/automatic table exposure controls are hidden. No settings were changed. SQL returned no stored PostgREST schema-setting hints. The owner confirmation resolves the API-toggle question; it is not a platform-API query or proof of future exposure settings. Keep the API off for this server-side-only application. Supabase documents disabled REST behavior and grant/RLS controls in its [API security guide](https://supabase.com/docs/guides/api/securing-your-api).

**Confirmed latent grant risk:** effective defaults for objects created by the current postgres operator in public grant anon, authenticated and service_role eight table privileges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN), sequence USAGE/SELECT/UPDATE, and function EXECUTE. The forecast includes implicit global PUBLIC defaults as well as explicit creator defaults/inherited grants; an absent pg_default_acl row does not imply no PUBLIC function EXECUTE. API roles have public USAGE but no public CREATE. No current RECON data exposure is established: the schema is empty and the owner confirms Data API is off. Review the latent defaults before creating/importing private application objects, especially before any future API enablement.

The authenticated operator is nonsuperuser but has CREATEDB, CREATEROLE, REPLICATION and BYPASSRLS, plus schema CREATE. **It is unsuitable as the application runtime credential.** No recon-prefixed role exists in the inspected catalog; an actual restricted Worker/Hyperdrive login and its binding origin remain Not Verified. The local binding configuration does not establish which remote role is used.

The first attempt's sanitized report recorded only PREFLIGHT_CHECK_FAILED/CHECK_FAILED, so its exact cause cannot be reconstructed. Stage-specific diagnostics were added without logging supplied fields/passwords, and the second complete run passed the read-only checks. The first failure report is retained privately; no write was attempted in either run.

## Runtime role proposal (not applied)

Use separate migration/object-owner and application LOGIN roles. The runtime role must have no superuser, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS, schema CREATE, object ownership, grant options or inheritance/SET path into migration/provider/API roles. Supply only the runtime credential to Hyperdrive and any Worker DATABASE_URL fallback. Do not use the broadly privileged operator credential for application traffic. Prisma's compiled client does not require schema ownership or migration-table access.

The preferred future provisioning path is a dedicated, restricted migration LOGIN role that owns only RECON objects, plus a separate runtime LOGIN role. Establish the new migration creator's API-denying defaults and global PUBLIC function restriction before it creates objects, then explicitly grant the runtime matrix after DDL. This avoids changing postgres/provider defaults for unrelated managed objects. The existing operator provisions these roles only under separate authorization; Prisma then connects as the dedicated migration creator, with public CREATE/USAGE but no database/role administration. Recheck effective grants after DDL because provider event triggers are present. No roles/defaults were created or altered by this task.

Keep public as the application schema to preserve the immutable migrations. Set and verify a trusted public/pg_catalog search path, with no writable-by-untrusted-role schema before application objects. Restrict public CREATE grants before relying on that path. Do not move application objects into a new schema in this task. [PostgreSQL schema/search-path guidance](https://www.postgresql.org/docs/17/ddl-schemas.html).

Proposed privileges are based on current source paths, not a live provisioning test:

| Objects | Runtime allowance / reason |
| --- | --- |
| Database and public schema | CONNECT and schema USAGE; no CREATE/ownership |
| AdminUser | SELECT/INSERT/UPDATE/DELETE for existing credentials login, fresh authorization and account management; secrets remain server-side |
| Brand, VehicleCategory, Car, HeroSlide | SELECT/INSERT/UPDATE/DELETE for inventory/homepage admin workflows |
| CarImage, CarFeature | SELECT/INSERT/DELETE for replacement child collections; additional UPDATE only if a reviewed route requires it |
| SiteSetting | SELECT/INSERT/UPDATE for loaders and upsert; no application DELETE required |
| Media | SELECT/INSERT/DELETE for uploads/library; production mapping/import uses the separately authorized operator role |
| SellCarLead, RequirementLead, AuctionSheetRequest, NewsletterSubscriber | SELECT/INSERT/UPDATE/DELETE for public submissions and authorized lead management |
| Department, Employee, EmployeePublicProfile, EmployeeVerificationIdentity, EmployeePublicationApproval | SELECT/INSERT/UPDATE; no DELETE; preserve all database guards |
| EmployeeAuditEvent | SELECT/INSERT only; never UPDATE/DELETE/TRUNCATE |
| recon_employee_official_code_seq | USAGE/SELECT, no UPDATE/setval/reset; existing employee fixtures exercised this allowance in LAUNCH-05B |
| recon_employee_code_seq | Retain immutable history; current runtime services do not allocate from this legacy sequence |
| Account, User, Session, VerificationToken | No current Credentials/JWT source path requires direct app queries; defer grants until separately testing an enabled adapter/provider feature |
| _prisma_migrations | No application privileges; operator migration role only |
| Types/functions | Review type USAGE and only required function access; no blanket EXECUTE on every public function |

Do not grant TRUNCATE, REFERENCES, TRIGGER or MAINTAIN to the runtime role simply because provider defaults include them. Existing employee row locks need appropriate SELECT/UPDATE privileges; AdminUser account safety uses `LOCK TABLE ... SHARE ROW EXCLUSIVE`, which is supported by its UPDATE/DELETE permissions without table ownership or TRUNCATE. [PostgreSQL LOCK permissions](https://www.postgresql.org/docs/17/sql-lock.html).

Default ACLs belong to the role that actually creates each object; changing defaults for another role or merely inheriting it is insufficient. Review both global and public-scoped defaults. PUBLIC function EXECUTE can survive a schema-only revoke. Plan narrowly scoped API-role denials/default changes and recheck effective privileges after migrations, without changing Supabase-managed objects or breaking provider policies. No executable permission changes are run here.

Do not enable RLS without reviewing runtime policies: a non-owner, NOBYPASSRLS app role can otherwise receive empty results or write errors. If target event triggers enable RLS automatically, verify the resulting flags and provide reviewed runtime policies before import/use. Supabase anon/authenticated roles should have no direct access to RECON admin credentials, settings, leads or employee ledgers. NextAuth JWTs do not establish Supabase Auth database identities. Do not solve policy failures by giving the runtime role BYPASSRLS.

The complete proposed grant matrix still needs an explicitly authorized isolated privilege rehearsal and post-provisioning connection checks. LAUNCH-05B verified engine/migration behavior and the existing employee runtime subset, not this entire application matrix. Hyperdrive must use the approved Supabase direct endpoint and restricted role, strict origin TLS and disabled query caching for fresh authorization/publication reads; wrangler.jsonc only proves the binding ID. No Cloudflare resource configuration was accessed or changed. [Hyperdrive Supabase integration](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/), [query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/).

## Active media mapping review

Read-only owner inspection found three distinct active settings/Media pairs (websiteLogo, footerLogo, favicon), all existing local files, and one unreferenced historical Media record to exclude. There are no database foreign keys targeting Media; current branding references use URL strings. Preserve existing Media.id and SiteSetting.id and rewrite matching Media.fileUrl/SiteSetting.value together in the target payload. No source record/file needs alteration.

Media.size records original uploaded bytes, while `uploadLocalDevelopmentImage` re-encodes PNG bytes through Sharp. The three stored file sizes therefore differ from that metadata. Use actual stored-file checksums for upload source identity; preserve original metadata unless an explicit correction is approved. This difference is explained by source behavior, not evidence of lost uploads.

The pure `mapActiveMedia` helper checks a complete three-ID mapping, exact old URLs, HTTPS Cloudinary delivery hostname/account, versioned URLs and one-to-one targets. It preserves all other record fields and source arrays and excludes historical media. Synthetic tests verify the transformation; no real target URLs or Cloudinary assets have been supplied or verified. All three Cloudinary configuration variables are currently absent locally; remote account/settings remain Not Verified. No Cloudinary request was made.

For later authorized transfer, call the low-level signed upload helper or a reviewed operator uploader. Do not use the admin upload endpoint as an import tool: it creates a new Media ID. Retain a private source-ID/checksum to Cloudinary public-ID/version/secure-URL mapping and verify actual delivery before approving the transformed payload. Favicon format/dimensions and logo delivery still need checks after real assets exist.

## Migration/import sequence and rollback boundaries

1. Separately approve API security provisioning, target role/identity, exact private admin/settings/media manifest, backup/PITR policy and a maintenance window with no concurrent application/API writers. Obtain fresh verified backups and a secure direct or Session Pooler credential. Never reuse the local database endpoint as a production fallback.
2. Confirm target freshness again. Protect the unused Data API/exposed schema and creator defaults before DDL; establish reviewed migration/runtime roles only after write authorization. Inspect provider event triggers/default ACLs and trust paths without changing managed schemas. Re-run this read-only probe after provisioning; a clean empty schema alone is insufficient.
3. Use pinned Prisma **7.10.1** and process-only target DATABASE_URL with verified TLS. Run migrate status/deploy/status for the original twelve SQL files; no seed, db push, migrate dev, reset or manual history copying. The local PostgreSQL 17.11 rehearsal passed all twelve checksums, schema guards and retries.
4. Do not assume all twelve migrations are one transaction. None of the checked-in files has an outer BEGIN/COMMIT. The installed engine commit `d1b3f377ca835d73fd50954a5e22128b9ebdd6b8` applies parsed statements individually and may leave a partially applied file on failure; parser fallback may submit a complete script. Prior completed migrations remain applied. This differs from newer Prisma APIs: do not change commands or add transaction wrappers to immutable history. [Pinned engine implementation](https://github.com/prisma/prisma-engines/blob/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/schema-engine/connectors/sql-schema-connector/src/flavour/postgres/connector/native/mod.rs#L136).
5. Require twelve finished checksums and verify 23 application tables plus migration metadata, constraints, custom indexes, guards, sequences, RLS flags and effective runtime/API permissions. Prisma diff omits some SQL-only safeguards. Stop before import on any discrepancy. A failed migration requires inspection of actual objects/history and a separately approved repair/reconciliation; no automatic reset, blind retry or marking successful. [Prisma 7 failure recovery](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing).
6. After persistent media delivery and the exact payload are approved, import AdminUser, SiteSetting and approved Media rows in one target transaction with a cooperative advisory mutex. Preserve IDs, bcrypt hashes, roles/types/timestamps; only approved media URL fields change. Verify exact canonical rows/counts and empty unrelated tables before COMMIT. Do not copy roles, sessions, provider schemas, test fixtures or source migration-history rows.
7. Repeat imports skip only exact approved matches; any conflicting ID/email/key/field or unexpected row aborts without overwriting owner edits. LAUNCH-05B proved atomic failure rollback, no-op retry and conflict rejection locally. Its runner deliberately rejects production targets; it is not a ready production importer. A future operator wrapper must pin target identity/TLS/schema/history/manifest and hide private logs.
8. Import rollback covers that transaction, not prior DDL or successful Cloudinary uploads. Retain uploaded assets/mappings if a later import fails. After a COMMIT or live owner edits, use before-images/backups and approved recovery with reconciliation, not a destructive rollback. Never resurrect stale employee approvals or reuse employee codes. Verify owner login/logout, settings and media separately after import, then take a protected target backup before separately authorized cutover.

## Verification and final status

**Preflight tooling/review complete; production writes remain BLOCKED pending separately authorized security provisioning and transfer preparation.** The target identity, verified TLS, catalog freshness and migration privilege prechecks pass. LAUNCH-05B remains the engine/SQL compatibility evidence. Remaining gates are creator/API privilege hardening, dedicated migration/runtime role provisioning and complete privilege rehearsal, Hyperdrive origin/role/TLS/cache verification, approved persistent media URLs/manifest, and production backup/PITR/recovery confirmation. The owner-confirmed Data API OFF state should remain unchanged.

Executed checks: 14 catalog-query syntax checks inside a verified read-only local transaction, followed by the complete live PostgreSQL 17 read-only probe; **12** target/TLS/security/media tests; **17** admin/redirect/Workers/settings UI regressions; TypeScript; PowerShell/JavaScript syntax; standard production build using the existing isolated output directory and read-only local connection defaults. No database-mutating employee/persistence runner was executed in this read-only task. No actual runtime login, production DDL/import or Cloudinary delivery test is claimed.

Final preservation and staged secret review passed. All 18 local owner table/schema fingerprints, environment/upload/migration file hashes and both verified backup checksums matched the private before-records. Application code, migrations and dependencies are unchanged. Any unknown platform state stays Not Verified. Tooling completion and production-write readiness are separate results; no production writes occur merely because read-only checks pass.
