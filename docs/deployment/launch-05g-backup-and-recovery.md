# LAUNCH-05G: production backup and recovery readiness

Prepared 2026-11-14 (Asia/Dhaka), after reviewing LAUNCH-05A through 05F, the private verified backups, PostgreSQL 17 rehearsals and verified production media mapping. The owner explicitly allowed writes **only to a new disposable PostgreSQL 17 cluster** for this rehearsal. Existing databases were not started, stopped or written. No production connection, migration, grant change, Cloudinary operation, environment edit, push, deployment or DNS action is included.

## Scope and status

The operator workflow backs up the **public RECON application schema**, its data and its own Prisma history. It is not a full Supabase project/platform backup. Supabase-managed auth/storage/realtime/vault schemas, Storage objects, platform configuration, role passwords, application environment secrets and Cloudinary binaries beyond the three approved originals need separate recovery material. NextAuth application records in public are included. PostgreSQL roles are documented by attributes, memberships and ACLs, not copied with their login secrets.

Supabase Free does **not** provide automatic daily backups or PITR; paid-plan backup features must be verified in the owner's actual dashboard. No current account entitlement or off-site service was accessed. [Supabase Free backup FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups), [backup limitations](https://supabase.com/docs/guides/platform/backups).

Tooling/rehearsal readiness is distinct from permission to migrate. **Production migration: NO-GO until the checklist below is approved and current production checks pass.** No new production export or live Supabase restore is claimed by this preparation task.

## Operator-triggered encrypted export

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/launch05g-backup-prompt.ps1
```

The prompt accepts the approved Session Pooler host, project reference twice, matching role.project username, trusted Dashboard CA, hidden database password and a separate hidden encryption passphrase twice. It never loads production credentials from .env or falls back to localhost. This wrapper intentionally supports Session Pooler **session mode, port 5432** for the existing IPv4 workstation; direct database connectivity remains an alternative reviewed procedure, not a silently selected fallback. Transaction pooling/6543 and Hyperdrive are rejected for exports. [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).

Both Node and the pinned official PostgreSQL 17.11 clients verify certificates and hostnames. Use the existing trusted Dashboard CA or a newly verified successor; never disable TLS verification. The source must report PostgreSQL major 17, database postgres, the expected authenticated SQL role and a read-only transaction. Credentials pass over stdin to a short-lived process, not shell arguments, tracked files or chat. libpq uses new ACL-protected temporary service/password files with exact host/database/user matching; they are removed afterward. Original environment files are untouched. Transient managed-runtime strings cannot be guaranteed securely erased.

The tool uses BEGIN READ ONLY / REPEATABLE READ, row_security=off, an exported snapshot and `pg_dump -Fc --schema=public --snapshot=... --no-privileges`. Canonical row fingerprints are streamed through a cursor in bounded client batches from the same snapshot. Unknown public tables and unsafe RLS coverage stop the export; it never treats hidden rows as empty. Insufficient table/sequence privileges or a failed utility abort the run. Use the approved application owner/backup credential, never an API key or an underprivileged runtime role. No role or privilege is automatically granted. [pg_dump consistency and scope](https://www.postgresql.org/docs/17/app-pgdump.html), [snapshot synchronization](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION).

Every run is under current-user/SYSTEM-only, Git-ignored `.local/launch05g/<timestamp>-production-export-<nonce>/`. The completed recovery set consists of:

| Artifact | Contents |
| --- | --- |
| application.pgdump.enc | Custom-format public schema/data archive, including tables, migration history, enums, sequences, indexes, constraints, functions and guards |
| recovery-metadata.json.enc | Encrypted origin/TLS CA identity, snapshot row/schema fingerprints, history/checksums, sequence watermarks, TOC, original archive SHA-256, role/membership/default/object grant documentation and immutable migration/role SQL sources |
| media-recovery.json.enc | Independent verified LAUNCH-05F mapping, Media/setting IDs, original source inventory, source checksums and the three original PNG bytes |
| backup-index.json | Sanitized sizes/SHA-256 for the three encrypted artifacts, counts and verification flags; contains no credentials or row contents |

Encryption is AES-256-GCM with a fresh 16-byte salt and 12-byte nonce per artifact, authenticated version header and scrypt-derived 256-bit key (N=32768, r=8, p=1). Format RECONPG1 is 8-byte magic + salt + nonce + ciphertext + 16-byte tag. A SHA-256 index detects damaged copies; GCM authenticates encrypted contents. Keep the strong passphrase in an independently recoverable password manager and approved recovery escrow **separate from archives**. Losing that key makes the archives unrecoverable. No production key is generated or escrowed automatically.

The dump is first staged privately; encryption is round-trip verified before the new plaintext archive is removed. A failed run can retain protected `.partial` files for review. They are sensitive plaintext, never an off-site backup set. Only a completed index plus all three authenticated artifacts is eligible for off-site copy. Removing temporary files does not promise forensic erasure on SSDs; use device encryption and trusted workstation access. Earlier verified backups are never overwritten, re-encrypted in place or deleted.

`EXPORTED_ENCRYPTED_RESTORE_NOT_YET_VERIFIED` means readable archive and successful encryption round-trip, **not** a completed restore rehearsal. Sequence values are not MVCC snapshot data. Before/after watermarks are recorded; a changing sequence requires extra reconciliation. Even stable values do not cover codes issued after the backup cutoff.

## Secure verification/decryption and isolated recovery

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/launch05g-decrypt-prompt.ps1
```

This separate prompt accepts only the trusted backup directory and hidden encryption passphrase. It checks index paths/sizes/hashes, authenticates metadata/media, fully authenticates the decrypted archive **before returning it**, verifies original bytes, reconstructs the three original PNGs and writes a protected reviewed TOC. It makes no database connection and executes no SQL. Output is sensitive local plaintext under a fresh private directory; do not upload it or add it to Git. Use only owner-created trusted archives: a PostgreSQL restore can execute SQL supplied by its archive.

For a restore, obtain separate target/write authorization and confirm a **fresh empty application target** with matching PostgreSQL 17 version/locale and required dependencies. Never point a disposable runner at Supabase or recon_local. Do not restore a PostgreSQL 18 local archive into PostgreSQL 17. Verify the target's identity, empty public application namespace, owner, port/marker and TLS before any SQL.

1. Preserve incident evidence/new data first. Provision reviewed migration/runtime roles and private creator defaults on the new target, with credentials from the separate vault. Keep unused Supabase Data API OFF. On a VPS, review/adapt Supabase-specific API-role references; do not blindly replay platform ACLs or copy privileged local roles.
2. Inspect the authenticated TOC. Keep the pre-existing public schema and provider schemas intact. The helper comments out only the exact public SCHEMA/COMMENT entries that would collide; all application entries retain original order. Any other conflict or unexpected dependency stops recovery. Do not DROP public, clean/reset an existing target, disable guards or use replication-role bypasses.
3. Restore pre-data, data and post-data together, as the approved object owner, with `pg_restore --single-transaction --exit-on-error --no-owner --no-privileges --use-list=<reviewed-list> --dbname=service=<verified-target> <authenticated-archive>`. Full archive ordering loads historical rows before guard triggers are installed. A data-only import into already active guards is not a general history-recovery procedure. [pg_restore ordering/transaction behavior](https://www.postgresql.org/docs/17/app-pgrestore.html).
4. Compare every application table's row count/canonical fingerprint, all migration entries, columns/enums, constraints/indexes, five enabled guards and exact sequence last_value/is_called. Restore the archive's own production migration history; never substitute the ten-entry local history. Reapply the reviewed runtime/API grant matrix and test permission denials. Catalog/ACL documentation is evidence for review, not an automatically executed role restore.
5. Verify retained Media/setting IDs and paired URLs against the independent media bundle. Original files can recover the approved assets if Cloudinary is unavailable; uploading/repointing requires separate authorization. Database archives contain references, not general Cloudinary/Storage backups. This media tool freezes only the three approved branding originals; future media needs a separately maintained original-asset manifest/backup process.
6. Before service returns, reconcile post-backup resignations, consent withdrawals/erasure, admin deactivations, newer settings/leads and all potentially issued employee codes. Preserve gaps/high-water marks; never reset issuance to MAX(code), reuse lost codes or republish stale approvals. Keep public verification/directory and issuance unavailable until evidence establishes safe eligibility/allocation. No existing maintenance toggle is assumed or implemented here.
7. Privately verify actual admin login/logout, current authorization, settings/media rendering and runtime connectivity on the recovered environment. Reconcile secrets/session validity through an approved operational process. Take and off-site verify a new post-recovery backup before separately authorized cutover. Dispose only newly created plaintext working copies under approved retention; retain original archives and forensic evidence.

This task provides no automatic production restore command or target write mode. The executable restore runner accepts only newly generated loopback disposable targets. A real Supabase recovery requires managed-extension/event-trigger/ownership review; stock PostgreSQL cannot certify those provider effects.

## Rehearsal and original preservation

Run `node scripts/launch05g-rehearsal.mjs` only when writes to a **new isolated disposable cluster** are authorized. The runner uses the existing vendor-checksummed PostgreSQL 17.11 binaries and a new loopback-only TLS cluster, random credentials, three new named databases and nonce markers. It never reuses an old cluster/database. It applies the twelve immutable migrations only to the new synthetic source, then tests export/encryption/decryption and two fresh full restores. Only its own verified server is stopped; private evidence is retained.

Synthetic records include an administrator, setting, active employee, submitted immutable profile and append-only audit event, plus an actually consumed official employee-code sequence. They are not owner/production records. The three real, already-approved media source files/mapping are backed up independently and checked without Cloudinary access.

The rehearsal checks exact rows/schema/history, 24 tables (23 application + history), 92 indexes, 44 constraints, five enabled guards, sequence state, provider-style sentinel preservation, runtime/API denials and specific SQLSTATE failures for forbidden history replay, foreign-key violations, audit mutation, ledger deletion and allocation reset. It does not disable guards. The archive restore is repeatable into another empty target; it does not overwrite a nonempty target.

An early harness attempt requested data_directory from a restricted role and stopped before migrations. That check now uses the bootstrap connection for the directory and validates restricted connections through verified TLS, unique marker, role, port and version without widening privileges. Failed evidence and original backups were retained. Existing owner tables, media, environment/migration files, verified PostgreSQL 18 archives and prior task reports are compared before/after using read-only checks.

Rehearsal encryption uses a random synthetic-only passphrase escrowed through current-user Windows DPAPI in its private directory. This is **not portable production key escrow**. Real backup passphrases must remain recoverable independently of this Windows account/device. Existing PostgreSQL 18 archives retain their original access protection; they are not silently altered or promoted to PostgreSQL 17 restore inputs.

## Storage, retention and failure handling

Proposed policy, requiring owner approval: retain pre-launch/before-change and post-change snapshots through sign-off, then 14 daily, 8 weekly and 6 monthly verified encrypted recovery sets. Retain longer only for an approved legal/business need; account for employee erasure/privacy obligations when retaining historical records. No schedule or deletion job is installed.

Keep an encrypted local recovery set plus two independently protected copies, including one off-site and preferably immutable/offline. Choose an owner-approved destination with MFA, least-privilege access and recovery access independent of Supabase/Cloudinary. Copy only the three `.enc` files and index, verify destination SHA-256 against the index, then perform a restore drill from an off-site copy. Maintain a recovery log recording cutoff, successful export/restore, key escrow check, copy hashes and operator. No off-site copy/destination was configured or accessed here.

Proposed cadence: nightly and before/after migrations/imports/significant administrative changes; monitor success and storage capacity, and rehearse quarterly and after schema/role changes. Review actual database size, export duration and provider egress/storage quotas before approving the schedule. Operator-triggered scripts alone are not automation. Until scheduling/monitoring/off-site checks exist, RPO is the last successful available verified backup and may be much longer than a day. RTO must include incident review, secret recovery and employee reconciliation; it is not established by the short local synthetic drill.

A failed Prisma migration can leave prior files and part of the current file applied; no all-twelve transaction is assumed. Stop writers, capture read-only forensic/export evidence, inspect actual schema/history and choose a separately reviewed forward repair or fresh-target recovery. Never blindly mark applied, seed/reset, delete history or edit immutable migration checksums. A failed approved data-import transaction rolls back its own rows, not earlier DDL or successful media operations. An accidental data-loss incident requires a fresh target and post-snapshot reconciliation, not restoring over the only surviving evidence.

## Production migration go/no-go checklist

- Owner approves exact Supabase target, maintenance/write scope, admin/settings/media allowlist and the LAUNCH-05D security phases; recon_migrator/recon_runtime credentials are provisioned privately under separate authorization.
- Fresh read-only target/TLS/version/freshness check passes, Data API is still OFF, provider defaults/event triggers/RLS are reviewed, and the actual migration/runtime privileges are verified. Earlier reports are historical evidence, not a current target query.
- The verified local PostgreSQL 18 baseline remains intact. A fresh encrypted production pre-change export (even an empty application baseline), key-recovery check and approved off-site copy exist; the restoration procedure has been reviewed for actual managed dependencies.
- All twelve immutable migration names/checksums and the approved 31-row owner payload are checked. LAUNCH-05F's three HTTPS mappings preserve existing IDs; production import is atomic, exact-match idempotent and conflict-aborting. No source history, sessions or synthetic fixtures are imported.
- After each separately authorized phase: verify history/guards/constraints/runtime API denials, then data integrity, real admin access and media delivery. Capture and verify post-import production backup before cutover.
- Assign backup operator/monitoring owner, off-site destination, key escrow, retention, incident reconciliation and restore-drill ownership. Verify Hyperdrive direct origin/restricted role/TLS/no query caching separately before launch.

Outstanding owner actions: approve the policy/destination/key recovery ownership, run the prepared read-only production export with fresh private credentials when ready, recheck the actual Supabase target and separately authorize security provisioning/migration/import. **No production write is authorized by this task's successful local rehearsal.**

## Verification and changed files

**Final rehearsal: VERIFIED**, private evidence `.local/launch05g/20261114081816233-restore-rehearsal-08823471/rehearsal-result.json`. The same encrypted PostgreSQL 17.11 synthetic-source archive restored into two new empty targets with exact row/schema/history fingerprints, 24 tables, 92 indexes, 44 validated constraints and five enabled guards. All twelve finished migration checksums matched the original SQL. Employee submitted history, exact sequence state, specific permission/guard/FK denials, API denials, provider sentinel and independent three-asset recovery passed. Decryption-only tooling was exercised as part of the actual restore. Only the new disposable server was stopped.

All 18 original owner table/schema fingerprints and **96 protected original files/prior reports** matched before/after. Both existing PostgreSQL 18 archives matched their recorded hashes and passed pg_restore --list using the compatible 18.7 utility; their earlier real PostgreSQL 18 restore evidence is retained. Three new encrypted-artifact SHA-256 checks passed; native GCM/encryption round-trip and decoded media checks passed. Temporary export credential files and authenticated plaintext restore archive were removed; encrypted artifacts, private schema evidence and original backups remain. The new decryption working directory still contains protected plaintext metadata and reconstructed public PNG copies for local review; never copy that directory off-site.

Final focused checks: **53 tests passed, zero failures/skips** across LAUNCH-05A/B/C/D/E/F/AUTH/G. These include six new tests for preservation of existing partial archives before any database call, authenticated encryption/key/corruption/overwrite rejection, nonce diversity, target/TLS restrictions, private libpq credential handling and narrowly reviewed TOC filtering. TypeScript without emit, JavaScript syntax and both PowerShell parser checks passed. No application code/dependency/schema/migration changes are made; a Next/Workers build is not required or claimed for these operator-only tools.

```powershell
node scripts/launch05g-rehearsal.mjs
node --import tsx --test tests/security/launch05g.test.mjs tests/security/launch05a.test.mjs tests/security/launch05b.test.mjs tests/security/launch05c.test.mjs tests/security/launch05d.test.mjs tests/security/launch05e.test.mjs tests/security/launch05f.test.mjs tests/security/launch05f-auth.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Limitations: no actual Supabase export, fresh production-role/platform check, real owner login test, off-site copy, automation, production restore or measured production RTO was performed. Those are explicit owner gates before production writes; no secrets or dashboard access was requested for this preparation-only task.

Created: scripts/launch05g-crypto.mjs, launch05g-backup.mjs, launch05g-backup-prompt.ps1, launch05g-decrypt.mjs, launch05g-decrypt-prompt.ps1, launch05g-rehearsal.mjs, tests/security/launch05g.test.mjs and this report. Modified: scripts/launch05a-common.mjs solely to permit the protected LAUNCH-05G directory scope. Private archives, metadata, credentials, copied images, cluster files and reports are excluded from Git. Commit only verified tooling/documentation locally; no push/deployment.
