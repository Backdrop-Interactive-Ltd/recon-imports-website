# LAUNCH-04: Supabase migration and approved data-transfer plan

Prepared 2026-11-14 against local `main` at `a829edc4f8b7ad1f4ea57dbc0593f252a15a1e32`. This is a procedure for later authorization, not an execution record. Only this document is changed. No migration, export, backup creation, restore, production connection, media upload, environment edit, push or deployment was performed.

## Verified source and compatibility

Read-only, repeatable-read SQL verified the existing `recon_local` cluster on loopback port 54329, PostgreSQL **18.6**, and its expected project directory. All 18 public tables exist: 17 application tables and `_prisma_migrations`. Ten migrations are applied, all checksums match source, and there are no failed/incomplete migrations. No employee-domain objects were found. The only installed extension is built-in `plpgsql`.

| Pending migration | Source review and preservation assessment |
| --- | --- |
| `20261113143000_add_employee_identity` | Adds six new tables, enums, indexes, one sequence, constraints and five trigger functions. New foreign keys reference existing AdminUser rows without updating those rows. No existing owner-table rows are rewritten or deleted. |
| `20261113180000_align_employee_lifecycle` | Adds a new official-code sequence and Employee.reactivationApprovalIds, replaces the new Employee validation constraint and approval guard. Retains legacy codes and the original sequence; initializes only the new sequence above previously allocated codes, with a minimum first allocation of 101. Unknown formats/exhaustion deliberately abort. |

Applying both in order is **expected to preserve existing owner records on this verified baseline**. This is source analysis supported by earlier disposable-database evidence in `docs/security/eid02b-validation.md`, `docs/security/eid03-implementation-report.md` and `tests/employees/eid03Bootstrap.test.mjs`; neither migration was executed or retested here. DDL/name conflicts, privileges, locks and target compatibility remain rehearsal gates. Foreign-key creation can briefly block concurrent admin writes.

The minimal production-transfer path does **not** require upgrading the local owner database: migrate a fresh, authorized Supabase application schema through all twelve migrations, then transfer only approved baseline records. A later local employee upgrade needs separate authorization, a fresh backup, no concurrent employee writers, and before/after verification of all 17 original application tables. Do not wrap these existing migration files in ad-hoc edits or regenerate their checksums.

## Essential production inventory and exclusions

| Local source | Verified count | Proposed production disposition |
| --- | --- | --- |
| AdminUser | 1 active SUPER_ADMIN; no recognized synthetic markers | Owner approves this exact account privately. Preserve its ID, bcrypt passwordHash, role, active flag and timestamps; do not publish name, email or hash in Git/reports. Confirm or rotate its login credentials through an approved secure process. |
| SiteSetting | 27 | Owner reviews and approves keys/values, including contact/payment details and placeholders. Preserve IDs, types and timestamps. Change only explicitly mapped media URLs in the transfer payload. |
| Media | 4 | Three are referenced by current settings. Transfer those three if approved; the remaining historical/unreferenced record is excluded by default pending owner review. Preserve approved IDs and metadata. |
| Brand, VehicleCategory, Car, CarImage, CarFeature, HeroSlide | All empty | No local inventory/category/hero rows to transfer. Do not manufacture records from frontend fallback arrays. |
| Leads, auction requests, newsletter records | All empty | No rows to transfer; revisit approval/privacy scope if counts change. |
| Account, User, Session, VerificationToken | All empty | No transfer. Keep local session/token material out of production. Custom AdminUser/NextAuth authentication is separate from Supabase Auth. |
| Employee-domain tables | Absent locally | Create schema through migrations, leave data empty. Never import synthetic employee/consent/audit fixtures. |
| `_prisma_migrations` | 10 rows | Do not copy into a freshly migrated target; Prisma creates its own twelve-entry production history. |

Exclude every `.local/eid02b*`, `.local/eid03*`, `.local/data02*` cluster/manifest and the Workers-smoke fixtures, synthetic accounts, test consents, caches and generated output. A filename/name-prefix heuristic is not approval: use an explicit private allowlist of record IDs and setting keys. PostgreSQL login roles/credentials are not website admin accounts and must not be cloned from local configuration.

`app/car-stocks/data.ts` and `app/page.tsx` use source-code fallback inventory when there are no published database cars or queries fail. These are not production-approved database records. A rendered car page does not prove a successful transfer. Owner must review real stock and fallback behavior before public launch; no application behavior is changed here.

## Media dependency

`websiteLogo`, `footerLogo` and `favicon` contain local upload references. All four Media rows use local upload URLs. The four unique referenced files exist, totaling **176,723 bytes**; no missing/unsafe paths were found. This does not establish legal/business approval to publish every historical image.

Workers builds intentionally exclude `public/uploads`. Before approving the transformed data payload, migrate the three currently used files to the owner's approved Cloudinary account, or approve a persistent service preserving the existing URLs. Record a private mapping of local reference/file checksum to Cloudinary public ID, version and secure delivery URL. Keep original files and records untouched. Verify returned assets, format/dimensions and delivery; optimized delivery bytes need not equal the original source bytes.

Rewrite matching SiteSetting.value and approved Media.fileUrl fields together in the **target payload/transaction only**. Keep all other fields unchanged. Validate no approved target reference still begins with `/uploads/`, unless an explicitly approved compatibility service exists. Test logo, footer logo and favicon with fresh/versioned URLs. No mapping, media transfer or reference update is performed in this task.

## Secure connections and Supabase requirements

- Confirm Supabase project identity, environment, region, actual PostgreSQL version, network access and backup/PITR policy before any connection. Match target major version to source where available; otherwise rehearse on the actual target version. A PostgreSQL 18 dump is not guaranteed to restore into an older major version. This plan rebuilds schema from migrations and transfers typed rows instead of restoring that full dump into Supabase. [PostgreSQL dump compatibility](https://www.postgresql.org/docs/18/app-pgdump.html).
- For migrations/import/backup, use a direct TLS connection or Supavisor **session mode on port 5432** when an IPv4-only operator cannot reach the direct endpoint. Do not use transaction mode/port 6543 for schema migration or backup. Use the exact Dashboard endpoint rather than deriving a hostname. [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
- Workers use the existing `HYPERDRIVE` binding for `recon-imports-production-db`. Its supplied ID in wrangler.jsonc proves only configuration. Verify its origin is the approved Supabase **direct** endpoint, runtime role, database, TLS settings and disabled query caching before use. Avoid stacking Supavisor pooling underneath Hyperdrive. Resource contents/connectivity were not verified here. [Cloudflare's Supabase integration](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/).
- Keep the existing quoted Prisma application objects in `public`; do not rename/move schemas or modify Supabase-managed `auth`, `storage` or other provider objects. Require a predictable trusted search_path/public schema. Existing SQL needs enums, sequences, arrays, constraints, indexes and PL/pgSQL triggers; it requests no custom extensions or superuser-only installation. Target privileges/features remain unverified.
- Use a dedicated migration/object-owner role for DDL and a separate restricted application role for Hyperdrive. Runtime must not own objects, administer roles or inherit the migration/postgres role. Review per-table CRUD, actor-lock permissions and trigger function access. Employee ledgers should not have DELETE privileges; EmployeeAuditEvent needs SELECT/INSERT, not UPDATE/DELETE. Employee code sequences need USAGE/SELECT, not reset/setval rights. Retain all custom safeguards, which Prisma schema syntax does not fully describe.
- This application uses server-side PostgreSQL, not Supabase browser Data APIs. Prefer disabling the unused Data API before importing private rows. Review default/existing grants on application tables, functions and sequences; anonymous/authenticated API roles must not read admin password hashes, payment settings or future employee ledgers. If Data API exposure is retained, separately review RLS/policies. NextAuth JWTs do not automatically establish Supabase Auth/RLS identities. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).
- Securely inject migration credentials into a **short-lived child process's DATABASE_URL**, because existing prisma.config.ts reads that variable; adding DIRECT_URL alone would do nothing. Do not edit the owner's `.env` or let a production task fall back to it. Runtime credentials belong in Hyperdrive; other Worker secrets belong in platform secret storage. Supabase API keys are not PostgreSQL passwords. [Prisma configuration guidance](https://supabase.com/docs/guides/database/prisma).
- Obtain credentials through the owner's password manager/secret store, not chat, Git, command-line URLs or pasted shell history. For PostgreSQL client tools, use access-restricted PGSERVICEFILE/PGPASSFILE entries outside the repository; avoid wildcard password entries. Child environments and any failure logs must remain private, with redacted summaries only. Do not echo environment values or run verbose shell tracing. [PostgreSQL password files](https://www.postgresql.org/docs/18/libpq-pgpass.html).

## Exact future execution sequence

Every write, remote connection, export or upload below requires separate owner authorization. These are planned operations only.

1. **Approve the run.** Select the source checkpoint and Supabase target; privately approve admin/settings/media allowlists, Cloudinary mapping, roles, maintenance window and retention. Confirm target has no existing RECON application objects/history or user data. Stop if it is not a fresh application schema; never overwrite an unknown existing project.
2. **Freeze the snapshot.** Pause relevant local admin edits/uploads by agreement; do not stop PostgreSQL. Reverify the exact owner cluster, migration checksums, row counts and file inventory. Capture one read-only repeatable-read snapshot for approved records. Recheck file hashes before/after export, abort on changes. Keep signed-off manifests, before-images and hashes outside Git.
3. **Back up first.** Use the already installed official PostgreSQL **18.7 pg_dump/pg_restore** tools, compatible with source server 18.6, from `%LOCALAPPDATA%/ReconImports/PostgreSQL-client-18.7/bin` rather than assuming PATH selects them. Create a fresh custom-format full backup outside both repository and source-backup folders with current-user/SYSTEM-only Windows ACLs. Back up `.env`/uploads separately in protected storage. Do not copy live cluster files. Configure libpq-supported service fields; do not pass Prisma-only URL parameters such as schema to pg_dump. Example operation shapes, after secure service configuration:

   ```text
   pg_dump --format=custom --file=<protected-local-backup> --dbname=service=recon_local_backup
   pg_restore --list <protected-local-backup>
   ```

   Require exit 0, nonzero size, readable contents and a recorded SHA-256. `--list` is not a restore test: rehearse recovery in a separately authorized disposable PostgreSQL 18 target, using no-owner/no-privileges as appropriate, then compare counts/fingerprints. Do not restore into the owner database. An older backup is not proof of the current snapshot. [Consistent pg_dump snapshots](https://www.postgresql.org/docs/18/app-pgdump.html).
4. **Prepare isolated operator credentials.** Once remote access is authorized, verify Supabase identity/version with read-only SQL before enabling writes. Check names/ownership, extensions, migration history, TLS and network path. Establish reviewed roles and API exposure protection through a separate approved provisioning step. Managed Supabase tables must remain untouched.
5. **Rehearse on an approved isolated target.** Using a snapshot copy and the actual target PostgreSQL version, exercise the twelve migrations, exact approved row transfer, grants and failure recovery. Never run existing disposable test runners against production; their fixtures write synthetic data. Earlier test reports are evidence of domain behavior, not a Supabase certification or a rehearsal performed by this task.
6. **Migrate the fresh production application schema.** With the pinned installed Prisma **7.10.1** CLI and a securely injected, verified migration DATABASE_URL, run the following only after authorization:

   ```text
   node node_modules/prisma/build/index.js migrate status
   node node_modules/prisma/build/index.js migrate deploy
   node node_modules/prisma/build/index.js migrate status
   ```

   Route raw CLI output to protected logs; it can disclose endpoint metadata. The initial status can report unapplied migrations/nonzero on a fresh target; distinguish that expected state from connection, history or drift failures before proceeding. `migrate deploy` applies the ordered immutable files, requires no development shadow database and must not be replaced by db push, migrate dev, reset, latest-version tooling or manual schema recreation. Do not run the admin seed: prisma/seed.ts upserts the account and can overwrite password/role. [Prisma 7 production migrations](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production).
7. **Verify schema before data.** Require all twelve migrations finished, checksum matches and no failed migration. Expect 23 application tables plus migration metadata; Supabase may have additional managed tables, so compare names/definitions rather than total database count alone. Verify employee partial/unique indexes, five guards/triggers, foreign keys, constraints and both sequences. Apply/recheck the approved per-object runtime grants and API-role denials now that the objects exist, before importing private records. Employee data remains empty; do not consume nextval merely to inspect allocation.
8. **Finalize media and payload.** Execute only the separately approved Cloudinary work described above. Reconfirm signed-off record IDs/setting keys, private payload checksum, transformed URLs and original field preservation. Use PostgreSQL types and parameterized data handling, not SQL assembled from JSON/CSV strings. Full database backups are for recovery, not a blanket Supabase restore/import.
9. **Import approved rows atomically.** In one target transaction, acquire a transaction-scoped import mutex, verify schema/history/target identity and allowlist again, then insert AdminUser, SiteSetting and approved Media rows with original IDs, hashes, types and timestamps. Assert expected counts and mapped references before COMMIT. Do not copy roles, migration history, tokens, managed schemas, employee fixtures or other unapproved rows.
10. **Make retries safe.** The same approved payload may skip an already present row only when every approved field matches its expected transformed value. A conflicting ID, email, setting key, changed value or unexpected application row aborts the transaction; do not silently upsert over later owner edits. Log only counts/status and a protected manifest reference. A new approved payload/version needs a new reviewed run.
11. **Verify integrity and access.** Privately compare source/target canonical field fingerprints, allowing only the approved URL mapping; compare bcrypt hashes without displaying them, counts, active SUPER_ADMIN status and unique keys. Confirm unrelated application tables are empty and client API roles cannot access sensitive objects. Through an approved staging/runtime check, test actual owner login/logout, fresh admin authorization, saved settings and media delivery. Test controlled writes only if separately authorized. A page displaying fallback content is not sufficient evidence.
12. **Approve cutover separately.** Verify Hyperdrive origin/role/TLS/query-cache setting, Worker secrets and backups. Take a protected post-import target backup and record the signed-off result. Production release/DNS/push/deployment require their own authorization. Preserve local originals and recovery artifacts through the agreed retention period.

### Ordered migration history

```text
20260513180300_init_car_showroom_cms
20260513181548_add_admin_auth
20260514055000_add_reviewed_lead_status
20260514111424_add_auction_sheet_manual_payment
20260514112532_add_media_library
20260518050617_extend_vehicle_categories_for_homepage
20260520060326_add_car_youtube_video_url
20260520075539_add_car_wheel_size
20260520104934_add_car_sale_status
20260521045616_add_car_chassis_number
20261113143000_add_employee_identity
20261113180000_align_employee_lifecycle
```

## Failure and rollback rules

- Before cutover, the local database and original uploads remain authoritative and untouched. If backup/rehearsal/target validation fails, stop before schema/data writes.
- A failed migration is not a license to rerun blindly, mark applied, reset public, disable guards or drop managed schemas. Do not assume automatic all-or-nothing recovery across migrations. Inspect actual partial state and `_prisma_migrations`; choose a reviewed forward repair or reconcile/roll back the failed migration using Prisma's documented process only after its SQL state is understood. If necessary, use a separately approved fresh target instead. [Failed migration recovery](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing).
- A transfer transaction failure rolls back its inserts. Preserve failed-run diagnostics privately, correct the cause and retry the identical approved payload only after target verification. Do not truncate/delete conflicting rows to force success.
- If Cloudinary succeeds but the database transaction fails, retain the mapping and uploaded assets for review; do not delete original or remote media automatically. No release occurs with mixed old/new references.
- After production accepts new writes, pause access and preserve new leads/settings/audit evidence before recovery. Database restoration must be separately approved, reconcile post-snapshot writes and revalidate revocations/consent. Never reset/reuse employee codes or restore stale publication approvals into public service. Application rollback/forward repair is preferable to dropping immutable employee ledgers.

## Owner actions and remaining blockers

Owner must confirm the exact Supabase project/environment/version and grant a separately scoped connection/provisioning/migration/import authorization; approve the three-table payload and historical image disposition; supply credentials privately; confirm Cloudinary ownership and publication rights; approve roles, API exposure, backup/restore policy and cutover window; and review real inventory/fallback behavior.

Supabase existence, freshness, network reachability, privileges, version and managed-object layout are **Not Verified**. Hyperdrive origin/caching/TLS, hosted credentials and Cloudinary transfers are **Not Verified**. No executable export/import helper or private record manifest was created; that is later implementation work after approval. The plan is ready for review, not authorization to execute.

Validation performed here: read-only local identity/count/history/checksum/extension/media-reference checks; both SQL migrations and existing authentication/runtime paths reviewed; installed backup-tool versions checked; source/Markdown/Git diff and secret-exclusion checks. Existing `.env` and all four uploads remained byte-identical during the inventory check. No TypeScript/build or database-mutating test suite is needed for this documentation-only task, and none is claimed.
