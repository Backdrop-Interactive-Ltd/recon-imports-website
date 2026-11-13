# LAUNCH-05A: verified local backup and read-only Supabase check

These operator tools implement the backup/rehearsal and connectivity portions of the LAUNCH-04 plan. They never migrate/reset the owner database, import into Supabase, edit application .env files or touch uploads. No push/deployment/DNS changes are part of this workflow.

## Local backup and restore verification

From the project root on the existing Windows installation:

```powershell
node scripts/launch05a-backup.mjs
```

The script verifies the exact existing recon_local database, loopback port 54329 and project cluster directory. It does not start or stop that server. A read-only repeatable-read connection exports a snapshot; PostgreSQL 18.7 pg_dump takes a complete custom-format database backup using that same snapshot. Source credentials are taken only from the existing local configuration and passed to the client in its process environment, never command arguments or logs.

A timestamped run under `.local/launch05a/` is Git-ignored and has inherited Windows access removed: only the current user's SID and SYSTEM receive full control. The archive, fingerprints and logs inherit this protection. The script verifies the archive list and SHA-256, initializes a new PostgreSQL 18 verification cluster on a separate loopback port, creates an empty disposable database, and restores with exit-on-error/single-transaction/no-owner/no-privileges. It does not reset or reuse an existing database. Only the disposable server is stopped afterward; archive and restored files remain.

All non-system table counts and canonical SHA-256 row fingerprints, column/index definitions, sequence state and migration records are compared between source and restore. A second read-only source snapshot and .env/upload hashes check preservation. A mismatch fails verification and retains the archive. A single-database dump excludes cluster-wide roles; the disposable restore deliberately changes ownership/ACLs, while the archive retains original database metadata. This is an actual restore rehearsal, not just pg_restore --list.

Verified during this task: PostgreSQL source 18.6, client 18.7; 18 tables; one admin, 27 settings, four media rows and ten migration rows. Every compared table/schema fingerprint and migration record matched. Source rows, .env and four uploads were unchanged. The exact archive path, size, checksum and restore database are recorded in the ignored run's `backup-verification.json`; no private payload is embedded in this document. Do not delete the verified archive.

## Owner-supplied Supabase credentials

Run the local interactive wrapper in a visible PowerShell window:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\launch05a-supabase-prompt.ps1
```

The execution-policy option applies only to that process. Use Supabase Dashboard > Connect > **Session pooler**, port **5432**. Enter the hostname only, project reference, matching `role.project-reference` username and password in separate prompts. Never paste a connection URL or password into chat, shell arguments or the hostname field. The password uses Read-Host -AsSecureString; JSON travels only through the Node child process's standard-input pipe. It is not written to .env, a credential file, Git or reports. Unicode is escaped for Windows PowerShell 5 pipe compatibility. Credentials exist transiently in process memory; privileged local process inspection is outside this isolation boundary.

The checker accepts only a matching Supabase Session Pooler hostname/project/username, database postgres and port 5432. It never falls back to local DATABASE_URL and refuses localhost, transaction-pooler port 6543 and mismatched projects. TLS certificate/hostname validation stays enabled. Both connection defaults and the explicit transaction are read-only. [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres).

If system trust returns SELF_SIGNED_CERT_IN_CHAIN, obtain the server CA certificate from the trusted Supabase Dashboard > Database Settings > SSL Configuration. Enter its local path in the prompt, or supply the wrapper's CertificateFile parameter; PEM and DER certificates are parsed and must be valid CA certificates. This trust anchor is scoped to the single client connection, not installed into Windows or app environment variables. Never trust a certificate copied from an unverified failed connection, disable rejectUnauthorized, or fall back to plaintext. The first live attempt during this task stopped on this certificate error before SQL execution; its private failure report is retained. [Supabase certificate guidance](https://supabase.com/docs/guides/database/psql).

For this task, the exact production certificate URL was verified in Supabase Studio's [official certificate-download configuration](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json). The HTTPS download was validated as a currently valid, self-signed Supabase CA. Its fingerprint exactly matched the certificate the owner separately downloaded from Dashboard. The certificate and provenance remain under the ignored private run directory; neither certificates nor credentials are committed.

Queries inspect version, schema access, role/database/language privileges, application-object collisions, migration history and table row counts. No row contents, passwords, auth tokens or stored files are retrieved. Managed Supabase tables are distinguished; auth.users and storage buckets/objects are checked by counts where allowed. RLS-filtered or unreadable business tables are treated as unknown, never empty. Other managed system tables are not counted. Server-side permission/count failures stop safely and produce only sanitized error codes, not raw exceptions.

Each invocation gets a separate ACL-protected, ignored report directory. `supabase-result.json` contains sanitized metadata/status, never supplied credentials. Failed checks can be retried by rerunning the wrapper. Catalog/privilege prechecks do not prove actual DDL execution or provider API-exposure safety. No CREATE/ALTER/INSERT/UPDATE/DELETE/seed/migration is executed against Supabase. A successful connection does not authorize migration.

## Live verification result: 2026-11-14

The owner's second interactive Session Pooler connection succeeded with the verified Dashboard CA and `transaction_read_only=on`. The target reports PostgreSQL **17.11**, database `postgres`, and current schema `public`. Accessible schema names are auth, extensions, graphql, graphql_public, public, realtime, storage and vault. The migration credential has public USAGE/CREATE, database CONNECT/CREATE and PL/pgSQL USAGE. It is not a superuser but can create databases/roles and bypass RLS; it must not be reused as the application runtime credential.

No RECON application tables, migration-name object collisions or `_prisma_migrations` table were found. No non-managed table rows were detected; auth.users, storage.buckets and storage.objects each contain zero rows. Other Supabase-managed table contents were deliberately not inspected. No relevant unreadable or RLS-filtered counts prevented the freshness precheck. Provider-managed schemas and tables remain intact.

Result: **read-only migration prechecks pass; execution is not authorized or tested**. No DDL, migration, import or role change was attempted. Source PostgreSQL 18.6 and target 17.11 differ: do not restore the full PostgreSQL 18 archive into this older production server. Follow LAUNCH-04's twelve immutable Prisma migrations and approved typed-row transfer only after a separate rehearsal on PostgreSQL 17 and owner authorization. The two pending employee migrations remain unapplied locally.

Before production writes, separately establish a restricted runtime role, review Supabase default grants/Data API exposure, approve the exact admin/settings/media payload and resolve local-upload delivery. Hyperdrive origin, runtime credentials, TLS and query caching are outside this connectivity check. Backup/PITR and actual migration execution remain future verification gates. No Cloudflare access, push, deployment or DNS change occurred.

## Verification and limitations

```powershell
node --test tests/security/launch05a.test.mjs
```

Target validation tests reject unsafe/mismatched connections and require verified TLS/read-only defaults. PowerShell syntax, JavaScript syntax, Unicode transport and TypeScript (without emitting compiler caches) passed. The actual local archive restore verifies backup functionality. No application code or dependencies change; a Next.js build was not run for these operator-only scripts. Supabase status/version/readiness comes from the actual private probe result; absent credentials or a failed connection must remain Unverified/Blocked in future runs.
