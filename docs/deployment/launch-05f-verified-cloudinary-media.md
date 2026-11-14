# LAUNCH-05F-UPLOAD: signed Cloudinary upload and private production mapping

Completed 2026-11-14 from LAUNCH-05E's approved private inventory. Only websiteLogo, footerLogo and favicon were uploaded. No database changes, application environment changes, GitHub push, deployment, DNS changes or asset deletion were performed.

Read LAUNCH-05E, the earlier LAUNCH-05F failures and the successful LAUNCH-05F-AUTH report before execution. The earlier HTTP 401 calls were Admin API GET /ping failures before any asset lookup/upload. They do not identify which credential was wrong; no discarded secret was recovered. LAUNCH-05F-AUTH subsequently verified a privately supplied environment/key pair with HTTP 200 at 09:04:21 Asia/Dhaka on 2026-11-14, then stopped. This separately authorized upload task requires fresh private credential entry and a new account check.

## Operator procedure

Run the private prompt from the existing project root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/launch05f-cloudinary-prompt.ps1
```

The prompt first verifies the exact loopback PostgreSQL 18 recon_local cluster using a read-only connection, the three existing setting/Media relationships, approved source SHA-256 values, PNG decoding and both retained backup hashes. It creates a current-user/SYSTEM-only, Git-ignored `.local/launch05f/<timestamp>-media-upload-<nonce>` directory. There is no secret in process arguments. Use only the newly rotated Cloudinary secret in this private window; never supply credentials in chat, Git, command lines or browser code.

No Cloudinary cloud name was present in the local deployment configuration at inspection. The operator must identify the intended product environment from its dashboard and type that cloud name twice. If a cloud name is configured when preparation runs, the input must match it. Authenticated Admin API ping verifies credential access to that account; it does not independently prove company ownership. The private account report distinguishes configuration matching from owner confirmation.

The visible window is titled `RECON IMPORTS LAUNCH-05F-UPLOAD - Three approved assets`. The prompt pipes credentials to a short-lived Node process through stdin. Both API key and secret are hidden SecureString inputs in PowerShell; transient BSTRs are zeroed/freed and variables discarded. Use the key and newly rotated secret from the same enabled key entry. Managed runtimes cannot guarantee erasure of every transient memory copy. The tool does not use Cloudinary API keys/secrets from environment files for requests, persist them, or include raw provider responses/errors in reports. TLS verification stays enabled. Input failures now have explicit safe codes, including CLOUD_NAME_CONFIRMATION_MISMATCH, rather than an ambiguous assertion. Failed API requests identify ping, lookup or signed-upload operation without printing request credentials or provider error bodies. There is no automatic credential retry.

The operator module has only account ping, exact asset lookup, signed upload and restricted image download methods. It has no delete, overwrite, unsigned-preset or database-write operation. Existing application upload code and Node/VPS portability are unchanged; no dependency is installed.

## Identity, collision handling and proof

- Public IDs remain exactly `recon-imports/branding/migration-v1/<SHA256(Media.id + newline + source-SHA256)>` from the approved LAUNCH-05E inventory. No folder/prefix or random suffix is added.
- All three intended IDs are inspected through authenticated Admin API GET with source context enabled before any POST. Only HTTP 404 permits creation; auth/rate-limit/server/network errors stop execution.
- Every existing asset must pass the same metadata and master-content proof as a new upload. Context alone and `existing=true` are insufficient. A conflict aborts without overwriting it.
- Signed HTTPS multipart uploads include exact public_id, overwrite=false, unique_filename=false, use_filename=false, source-hash/plan context and fresh timestamp. SHA-256 signatures use sorted parameters and the secret, excluding file/API key. Canonicalization matches signature version 2, escaping ampersands against parameter smuggling; an independent regression compares actual plans against the already-installed official Cloudinary 2.10.0 SDK. No unsigned preset is created or changed. [Cloudinary signatures](https://cloudinary.com/documentation/authentication_signatures), [upload parameters](https://cloudinary.com/documentation/image_upload_api_reference).
- Following POST, an authoritative GET is required. Unknown POST outcomes are reconciled using that same ID; there is no blind POST retry or alternative public ID. A later operator rerun checks again before creating anything. [Cloudinary Admin API](https://cloudinary.com/documentation/admin_api).
- Metadata must match account, public ID, image/upload type, asset ID/version, original PNG dimensions and source context. The exact versioned original master must decode successfully and match the original byte size and SHA-256. Encoding differences stop automatic mapping as NEEDS_REVIEW.
- Each actual app-normalized delivery URL is fetched separately using `Accept: image/png`, decoded and fingerprinted: logo variants use f_auto,q_auto,w_260,c_limit; favicon uses f_auto,q_auto. Its derivative SHA is recorded independently of the original master. Full RGBA pixel hashes and fully transparent, partly transparent and opaque pixel counts are recorded for source/master/delivery. Master pixels and transparency must match the approved source exactly. Delivery must preserve visible content and transparency and match the expected dimensions (260 x 260 logos, 2000 x 2000 favicon for these sources). Requests have bounded bytes/time, no automatic redirects, and strict HTTPS host/path allowlists. API authorization is never sent to delivery hosts.
- PNG favicon delivery is required for this check. These requests do not prove every browser's automatic-format negotiation or deployed UI behavior. A browser/deployment check remains a launch gate; the existing 2000-pixel favicon source/normalizer is not changed here.

## Private mapping and preservation

The final `production-media-mapping.json` is published only after all three assets and final local preservation checks pass. It contains setting names/IDs, existing Media IDs, source URLs/SHA-256, Cloudinary public/asset IDs and versions, verified master/delivery HTTPS URLs, decoded formats/dimensions/bytes, delivered checksums and upload/reuse outcomes. `mapping-checksum.json` records the manifest SHA-256. `verified-assets.json`, numbered journal files and a sanitized failure report retain partial evidence safely if a run stops.

The existing pure `mapActiveMedia` function prepares the candidate payload without writing any database: only the three Media.fileUrl values and matching SiteSetting.value values change in memory. All IDs and other original fields/timestamps are retained; the historical unreferenced media row is excluded. Original settings/Media rows, all 18 owner table/schema fingerprints, environment/upload/migration file bytes and both backup hashes are compared before/after. Use the mapping only after separate production migration/import authorization and fresh target checks.

## Repeat, recovery and cleanup

If execution stops, retain the private run directory and inspect its sanitized stage/code, journal and preservation report. A successfully created Cloudinary asset may exist even if a later HTTP/mapping step failed. Fix the specific blocker, then rerun the prompt with the same approved inventory and newly rotated credentials. Matching deterministic assets are verified and reused; no duplicate ID or overwrite is chosen. Do not weaken checksum verification, enable unsigned uploads or disable TLS to bypass an error.

Before production import, rollback requires no source/database action: keep the original local files/records and preserve the verified Cloudinary assets and mapping for review. A future failed database transaction cannot roll back an HTTP upload. After a separately authorized import, reverse URL mappings only in a reviewed transaction that checks current values and later owner edits.

There is no automatic cleanup. Any future remote deletion requires separate explicit approval, exact account/asset ID/version, proof of creation/ownership and proof that current records/variants/manifests do not reference it. Reused pre-existing assets are not cleanup candidates merely because a run failed. Never delete original local files, historical media or assets by broad prefix. Preserve verified PostgreSQL backups and independent media copies.

## Verified live result

**UPLOAD_AND_MAPPING_VERIFIED**. The mapping was completed at **13:43:46 Asia/Dhaka on 2026-11-14** after fresh private credential entry and authenticated account access. All three deterministic IDs were inspected before any upload. Three assets were created, zero pre-existing assets were reused, no asset was overwritten or deleted, and the unreferenced historical image was excluded. No credential was recovered from an earlier attempt or retained for reuse.

| Setting | Result | Original master PNG | Master bytes | Verified app PNG | Delivery bytes | Transparency |
| --- | --- | --- | --- | --- | --- | --- |
| websiteLogo | UPLOADED | 2000 x 2000 | 37,837 | 260 x 260 | 1,837 | Preserved |
| footerLogo | UPLOADED | 2000 x 2000 | 36,720 | 260 x 260 | 1,857 | Preserved |
| favicon | UPLOADED | 2000 x 2000 | 42,338 | 2000 x 2000 | 6,840 | Preserved |

Each original master matched the approved source SHA-256, byte size, full decoded RGBA pixel hash and exact alpha statistics. All six master/app delivery URLs returned HTTPS 200 and decoded successfully. The actual PNG derivatives have their own recorded byte/pixel checksums and alpha counts; they retain both visible content and transparent pixels. An independent post-upload check repeated all six public HTTPS GETs without credentials and confirmed the recorded checksums, dimensions and transparency. The images and their verified URLs are real Cloudinary assets; no placeholder URL was treated as evidence.

The private manifest is `.local/launch05f/20261114031132771-media-upload-45db51a9/production-media-mapping.json`, with SHA-256 recorded in `mapping-checksum.json`. Its status is **VERIFIED_NOT_APPLIED**. The manifest preserves all three existing Media IDs, their paired setting IDs and all other original row fields. Only the approved three Media.fileUrl and SiteSetting.value replacements are prepared in memory. The original local records were not updated. The directory is access-restricted to the current user and SYSTEM and excluded from Git; the manifest, journal, images, credentials and local database data are not committed.

`completion.json` and `preservation.json` confirm success. Additional private `post-upload-public-verification.json` and `post-upload-preservation.json` record independent verification. All **18 owner table/schema fingerprints**, settings and media rows remained equal to the pre-upload snapshot. All **42 environment/upload/migration/backup files** retained their recorded hashes. Both PostgreSQL backup archives and all earlier failure/authentication reports were preserved. The only database connections were read-only connections to the verified local PostgreSQL 18 recon_local cluster; no Supabase connection, migration or database write was performed.

## Tests and completion boundary

Executed after live completion: JavaScript and PowerShell syntax; **49 tests passed with no failures/skips** (43 across LAUNCH-05F-UPLOAD, AUTH, 05E, 05C and 05A plus six Workers/persistence UI regressions); TypeScript without emit; Git staged whitespace and scope/secret review before commit. The uploader suite includes official-SDK signature agreement, explicit input diagnostics, operation-specific 401 failures, real alpha evidence and rejection of flattened/wrong-sized variants. Repeat-without-POST, collisions and unknown upload outcomes are verified by focused mocks; no second live upload run was needed or attempted. Existing authentication-only tooling remains unchanged and cannot upload anything.

Focused commands:

```powershell
node --check scripts/launch05f-cloudinary.mjs
node --check scripts/launch05f-upload.mjs
node --import tsx --test tests/security/launch05f.test.mjs tests/security/launch05f-auth.test.mjs tests/security/launch05e.test.mjs tests/security/launch05c.test.mjs tests/security/launch05a.test.mjs
node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/security/workersCompatibility.test.mjs tests/persistence/settingsUI.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Five files form this local task commit: `scripts/launch05f-cloudinary.mjs`, `scripts/launch05f-upload.mjs`, `scripts/launch05f-cloudinary-prompt.ps1`, `tests/security/launch05f.test.mjs` and this report. Application code/schema, migrations, dependencies, credential/environment files, original media and backup archives are unchanged. A standard/Workers build is not required for operator tooling alone and is not claimed here. No GitHub push or deployment was performed.

No upload or mapping blocker remains for the three approved assets. Production migration/import and switching live settings require a separate authorized task. Deployed rendering and browser-specific favicon negotiation have not been tested; the existing 2000-pixel favicon source/normalizer was preserved. Public delivery evidence applies to the documented PNG Accept header at verification time, not a promise that automatic-quality encoding or every browser format will remain byte-identical indefinitely.
