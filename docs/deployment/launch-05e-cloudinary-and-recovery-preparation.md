# LAUNCH-05E: Cloudinary and production recovery preparation

Prepared 2026-11-14 after reading LAUNCH-04 through LAUNCH-05D. **Preparation complete; no live upload, deletion, Supabase connection/write, migration/import, role change, environment/credential edit, push, deployment or DNS action was performed.** Dashboard/account status not supplied by the owner remains Not Verified.

## Existing integration and portability

- `lib/uploads/cloudinary.ts` reads CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Its signed SHA-256, Web Crypto, FormData/Blob and HTTPS fetch path works with the existing Node/Workers architecture without filesystem persistence or a new SDK. Cloudinary supports SHA-256 authentication; future operator signatures must include the fresh timestamp and signed parameters, excluding file/cloud_name/resource_type/api_key. [Cloudinary authentication](https://cloudinary.com/documentation/authentication_signatures).
- `app/api/admin/uploads/route.ts` checks current admin authorization, MIME/extension/3 MB validation and creates a **new Media row**. Normal uploads use random IDs/filenames. Do not use this endpoint for migration retries: it cannot preserve the existing Media IDs and is not idempotent for this purpose.
- `lib/uploads/local.ts` is development-only and re-encodes raster output as PNG using Sharp. Production Workers reject missing persistent storage, and the Workers build excludes public/uploads. Local upload persistence is not production storage.
- `lib/siteSettings.ts`, `lib/cloudinaryImages.ts`, `PublicLogoImage` and `app/layout.tsx` load branding through existing settings, image helpers and favicon metadata. Next Image permits res.cloudinary.com. The settings loader also normalizes URLs for admin reads: logo variants become f_auto,q_auto,w_260,c_limit and favicon becomes f_auto,q_auto.
- Store the **same app-normalized variant** in each target Media.fileUrl and corresponding SiteSetting.value; keep its original/master URL separately in the private upload manifest. This matches existing normalization and avoids a later admin save changing only one side of the URL relationship. A focused test checks the planned variants against the actual current helpers.
- Favicon source is a 2000-pixel PNG. Its current loader applies automatic format/quality transforms, so actual favicon MIME, dimensions and browser behavior remain a delivery verification gate. If fixed PNG/favicon sizing is required, approve a separate narrow favicon-normalization change before final launch; none is implemented here.
- No dependency, application logic or vendor-specific schema was added. Media remains ordinary PostgreSQL IDs/URL strings. LimdaHost VPS can retain HTTPS Cloudinary delivery or move originals to its own persistent storage while preserving IDs and mapping URLs. Update image host allowlists/optimization as needed for a new host; adapt Supabase-specific API-role grants to the actual VPS roles instead of blindly replaying provider ACLs.

## Verified local media inventory

The read-only tool verified the exact loopback recon_local PostgreSQL 18 cluster, then matched each of the three IMAGE_URL setting IDs to exactly one Media ID and one existing file beneath public/uploads. PNG magic bytes, Sharp decoding, dimensions, alpha, stored sizes and SHA-256 were checked. All 18 original owner table/schema fingerprints and environment/upload/migration file bytes remained unchanged.

| Setting | Stored file | Dimensions | Bytes | SHA-256 prefix |
| --- | --- | --- | --- | --- |
| websiteLogo | PNG with alpha | 2000 x 2000 | 37,837 | 71b3ced1307a33dd |
| footerLogo | PNG with alpha | 2000 x 2000 | 36,720 | f16fc3602b2e37d5 |
| favicon | PNG with alpha | 2000 x 2000 | 42,338 | 68fa29fd5e07efa3 |

Total stored bytes: **116,895**. Original upload-size metadata is 35,502 / 35,738 / 36,184 bytes respectively; it differs because the local helper re-encodes PNG. Preserve that metadata unless a correction is explicitly approved, and use actual stored bytes/checksums as upload identity. One unreferenced historical Media row/file is excluded from upload planning and left untouched. There are no foreign keys targeting Media; branding links are URL strings, so preserve both IDs and paired references explicitly.

The private, access-restricted and Git-ignored manifest is `.local/launch05e/20261114020718301-media-inventory-e14cfacc/media-inventory.json`. It contains exact Media/setting IDs, full original paths and hashes, deterministic plans and verified backup paths/checksums. No media files or private record manifest were committed. Cloudinary configuration presence: **all three variables absent locally**. Remote account, credentials, permissions, quotas, real URLs and assets: **Not Verified**.

## Signed upload and mapping procedure for a later authorized task

1. Owner approves these exact three source IDs/hashes and the target Cloudinary product environment. Freeze a versioned private manifest and recheck source/setting IDs, values and file checksums before each action. Changed content or references abort the approved run; never silently generate a replacement plan.
2. Obtain the existing target credentials through a protected local prompt or secret manager into a short-lived process, not chat, shell URL/arguments, .env edits, Git or logs. Keep API secrets server-side. Validate account identity and upload settings before enabling writes. No unsigned upload preset is needed for the signed server path. Cloudflare secrets are a separate future configuration step.
3. Use a dedicated operator uploader built on the existing HTTPS/signing primitives, not the admin upload route or its random-name helper. Plan each public ID as `recon-imports/branding/migration-v1/<SHA256(Media.id + newline + stored-file-SHA256)>`. This hides raw record IDs and remains stable for the same logical record/content. Send explicit public_id, overwrite=false, unique_filename=false, use_filename=false and source-hash/plan context. Do not set folder/public_id_prefix that changes that identity. Do not attach incoming transformations or an unreviewed preset. [Cloudinary upload parameters](https://cloudinary.com/documentation/image_upload_api_reference).
4. Before upload, look up that exact public ID in the approved account through the Admin API with context enabled. Only a confirmed not-found response permits creation. An authentication/rate-limit/network error is not absence. An existing result must pass the same full verification as a newly created result; never trust existing=true alone. A signed overwrite=false request is the race safeguard, not proof that a colliding asset is the approved source. [Cloudinary asset lookup](https://cloudinary.com/documentation/admin_api).
5. Upload the unchanged PNG bytes. Persist only whitelisted asset ID/public ID/version/type/format/dimensions/bytes/master URL/source context in the private journal; exclude raw API response credentials, request signatures and Authorization headers. A timeout can mean the asset was created: mark the outcome unknown, look up the same ID, and verify before retrying. Do not choose a random new ID to bypass a failure.
6. Verify account/public ID, image/upload type, source context, positive version, asset ID, PNG dimensions and no unexpected overwrite through authoritative lookup. Fetch only its strict HTTPS, versioned **original master**, with bounded bytes/time and controlled redirects; verify HTTP 200, image/png, actual decoded format/dimensions, byte size and SHA-256. Do not compare a lossy/auto-transformed logo derivative with source bytes. If master encoding differs, mark NEEDS_REVIEW and stop automatic mapping, even if the image looks correct; an owner-approved lossless-normalization policy would be a separate change.
7. Verify the actual app delivery variants independently: header/footer rendering, transparency, cache/version behavior and browser favicon delivery. `assessAsset` produces a usable normalized mapping only after master verification; `mapActiveMedia` preserves Media.id, SiteSetting.id and all other original fields/timestamps and excludes historical media. Write a private manifest checksum for final owner approval. Do not update the original local records.
8. After separate Supabase hardening/migration authorization and successful target checks, import the approved target payload atomically, changing only the three Media.fileUrl and matching SiteSetting.value URL fields. Preserve every other approved record field, and do not create replacement Media IDs or copy local sessions/source migration history.

The new `scripts/launch05e-media-plan.mjs` is **not an uploader**. Its CLI reads local metadata and backup archives only. Pure planning/evidence functions perform no network or database writes. No URL is fabricated as a verified business asset; tests use synthetic inputs only.

## Retry, rollback and cleanup boundaries

Maintain per-asset journal states such as planned, upload-outcome-unknown, verified, mapped and DB-referenced, keyed by the approved plan checksum. Reuse a fixed public ID only when metadata and original-master proof match; otherwise abort for review. For rate limits/transient failures, use bounded backoff and lookup before retry. Changed source bytes require a new approved plan, not overwriting the old asset.

Until database import, rollback means leave the source settings/files unchanged and retain the uploaded asset/journal for review. A later database transaction failure does not undo a successful Cloudinary upload. After import, restore prior target URL before-images only in a separately approved transaction and verify no later owner edits are overwritten. Cache invalidation does not restore records or media.

Do not delete original local files, historical assets or all resources under a prefix. Any later remote cleanup requires explicit approval, the exact asset ID/version/account, proof it was created by this run and is unreferenced in current target records/variants/manifests, and a retention/recovery decision. Pre-existing reused assets are not cleanup candidates merely because this migration failed. Cloudinary backup/versioning entitlement is Not Verified; keep independent originals rather than relying on it.

## Supabase Free-plan recovery findings

Current official guidance states Free does not include automatic daily backups; PITR is an add-on for paid plans. Do not treat internal replication, generic physical-backup implementation or possible support intervention as an owner-accessible recovery promise. The project's actual dashboard entitlement has not been queried here; the recovery design assumes Free until the owner confirms otherwise. [Supabase Free-plan FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups).

Supabase recommends regular exports/off-site copies for Free projects. Its database backups exclude Storage object bytes and custom-role passwords; database URLs/Cloudinary files and credential recovery therefore need separate protection. Project deletion also removes provider-held backups, so external copies are essential. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

The two existing LAUNCH-05A local custom-format archives are still **44,491 bytes each**, with matching recorded SHA-256 and successful pg_restore --list checks. Their earlier real PostgreSQL 18 restore verification remains valid historical evidence; no restore was executed in this task. They protect the local pre-production baseline, not future production writes, and are on the same local workspace/disk. No off-site copy, production export or recovery automation was created or verified here.

## Production recovery design

| Recovery material | Purpose / limit |
| --- | --- |
| Verified PostgreSQL 18 local archives | Recover the original local baseline into an isolated compatible PostgreSQL 18 target. Never directly restore them into Supabase PostgreSQL 17. |
| Twelve immutable migrations + pinned source commit | Recreate application structure, indexes and guards for a fresh installation; they do not contain production records. Preserve an off-site source/checkpoint artifact after separate authorization; local unpushed Git commits alone are not off-site recovery. |
| PostgreSQL 17 production schema-and-data archive | After production exists, capture all application objects/data, migration metadata and sequences in one consistent custom-format dump. Rehearse complete recovery on a separate target before relying on it. No such archive exists from this task. |
| Optional production data-only export | Additional approved record/forensic/reconciliation material, not a standalone restore method for employee ledgers with active insert guards. |
| Original media + asset/URL manifest | Recover actual files and IDs/URLs independently of Cloudinary or database availability; database archives contain references, not Cloudinary binaries. |
| Reviewed role/ACL scripts and credential vault | Recreate restricted roles/permissions and recover/rotate credentials under approval. Single-database dumps do not contain cluster login secrets. |

For future production exports, existing PostgreSQL **17.11 pg_dump/pg_restore** clients are available under `%LOCALAPPDATA%/ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin`. Their versions were verified. Use a verified direct or Session Pooler TLS connection in port 5432 session mode, not transaction pooling or Hyperdrive. Supply credentials in short-lived process/libpq service settings with verify-full and the trusted CA, never command-line connection strings or app environment-file edits.

Planned command shapes only, **not executed**:

```text
pg_dump --format=custom --schema=public --file=<private-archive> --dbname=service=<approved-production-service>
pg_restore --list <private-archive>
```

Use an approved backup/migration credential capable of reading all application rows/sequences without RLS filtering; a successful partial/filtered export is not a complete recovery copy. Confirm schema dependencies/extensions and unexpected public objects before choosing scope: schema-selected dumps do not automatically capture external dependencies. Record source version/identity, schema/history checksums, table counts/fingerprints, allocation watermarks, archive size/SHA-256 and cutoff time. Encrypt off-site copies, restrict local access, verify transfer hashes and monitor job failures. [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).

Proposed minimum cadence for owner approval: nightly production exports plus before/after migrations, imports or significant admin changes; retain pre-launch snapshots through sign-off and choose explicit daily/weekly retention. RPO is the last **successful off-site verified** export, potentially a day or more if jobs fail. RTO remains unmeasured until a timed recovery drill. No zero-data-loss promise is made without an appropriate continuous recovery mechanism.

### Fresh installation versus recovery after real production writes

For the initial empty installation, use LAUNCH-05D's roles/defaults, twelve migrations and the approved 31-row owner payload. After live employee history exists, blindly applying migrations and then inserting a data-only export can fail: the immutable profile/approval/audit insert guards reject historical non-draft/non-pending records.

The recovery path to rehearse is a trusted **full application schema-and-data archive** restored into a separate, verified empty application target. Provision restricted roles/private creator defaults first and keep Data API OFF. Preserve provider-managed schemas. Review the archive table of contents and public-schema creation/ownership entries against the new Supabase target; exclude only reviewed platform-owned public-schema CREATE/COMMENT/ownership entries if they conflict with the existing managed schema. Do not drop/recreate public to force a restore. Restore pre-data, data (including sequence state) and post-data in the normal archive order, as the approved migration owner, using no-owner/no-privileges and single-transaction/exit-on-error where appropriate. Triggers/indexes/foreign keys are post-data, so history can be loaded before guard triggers are installed. This does not require disabling guards on a live database or granting runtime superuser/BYPASSRLS. Reapply reviewed runtime/API grants afterward. [PostgreSQL 17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

Keep the production archive's own migration history for exact recovery; do not copy the ten-row local history into it. Verify the restored schema/checksums, constraints, five guards, sequences, role/API denials, field fingerprints, media and actual admin access before cutover. Missing dependencies, existing target records, changed ownership/RLS or failed validation stop recovery for review. This complete production archive recovery is **planned, not tested in LAUNCH-05E**; authorization and an appropriate archive are required for its isolated drill.

After any stale restore, keep employee publication/verification and issuance unavailable until post-backup resignations, consent withdrawals, erasures, audit evidence and potentially issued codes are reconciled. Never reset allocation to MAX(code), reuse a lost code or expose restored old approvals as current. If the surviving evidence cannot establish a safe high-water mark, issuance remains blocked pending an approved recovery decision. Reconcile new leads/settings/owner edits too. Export cadence cannot recover transactions that were never backed up.

## Owner actions and next authorized execution checklist

1. **Cloudinary Dashboard:** confirm owner-controlled product environment, correct cloud name, available signed-upload/API permissions, account limits, folder mode and approved prefix. Review default signed presets/incoming transformations, public image delivery and strict transformation settings for the actual logo/favicon variants. Do not enable unsigned uploads or weaken security just for this migration. Provide credentials privately in the later authorized task, not chat.
2. **Supabase Dashboard:** confirm current plan, Backups/restore/PITR entitlement, PostgreSQL version and Data API still OFF. Choose Free plus independently managed exports or an appropriately approved paid recovery option; do not assume PITR. Confirm account/credential recovery access without changing existing secrets now.
3. **Recovery ownership:** approve encrypted off-site destination, retention, RPO/RTO, monitoring owner and recovery drill. Protect original media, manifests, current source checkpoint and verified archives independently. No off-site backup service or schedule was configured here.
4. **Approve execution scope:** freeze the three source IDs/hashes and publication rights; authorize only the three Cloudinary uploads/lookups/download verification and private mapping first. Re-run the read-only inventory before executing; refresh backups/copies under separate authorization. Stop on changed files, credentials/account mismatch or an existing conflicting asset.
5. **Verify and sign off:** complete original-master proof and actual logo/favicon delivery checks, approve the final mapping/payload, then separately authorize the LAUNCH-05D production security/migration/import sequence. Take/verify a PostgreSQL 17 production export and rehearse recovery before public launch. GitHub push, Cloudflare deployment, DNS and credential cutover remain separate authorizations.

## Verification and files

```powershell
node scripts/launch05e-media-plan.mjs
node --import tsx --test tests/security/launch05e.test.mjs tests/security/launch05c.test.mjs tests/security/launch05a.test.mjs
node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/security/workersCompatibility.test.mjs tests/persistence/settingsUI.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Executed: the local read-only inventory/Sharp file verification; both existing archive SHA/readability checks; eight planner/evidence/mapping tests, including rejection of mismatched assets and stable actual image-helper normalization; existing target/TLS/media, Workers Cloudinary and settings UI regressions (**24 tests total, zero failures/skips**); JavaScript syntax; TypeScript without emit. No app code changed, so no new production/Workers build is required or claimed. Live Cloudinary authentication/upload/delivery and production export/restore remain Not Verified.

Created: this report, `scripts/launch05e-media-plan.mjs`, `tests/security/launch05e.test.mjs`. Modified: `scripts/launch05a-common.mjs` only to allow the same protected private-directory mechanism for LAUNCH-05E. No dependencies, app logic, schema, migration, environment, original file or verified archive changed. A reviewed local task commit records these preparation changes; no push or deployment.
