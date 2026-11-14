# LAUNCH-05F-AUTH: authentication-only Cloudinary verification

Prepared 2026-11-14. The two previous LAUNCH-05F HTTP 401 runs stopped at the Admin API `GET /ping` authentication check, before asset lookup or upload. Their private preservation reports passed. Credentials and raw error bodies were not retained, so their product-environment/key/secret pairing cannot be established retroactively. There was no configured cloud name for independent comparison. The initial cloud-name confirmation mismatch was a separate, earlier input-validation failure.

Cloudinary credentials belong to a product environment. Rotation may generate a new **key and secret pair**; use both values from the same enabled key entry, with that environment's cloud name. Do not combine a new pair's secret with an older key. [Cloudinary credentials](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials), [rotation instructions](https://cloudinary.com/documentation/ts_how_to_rotate_api_keys_in_the_console).

## Isolated operation

`scripts/launch05f-auth.mjs` imports only Node built-ins and the existing protected report-directory helper. It does not import the uploader, SDK, Prisma/pg, application configuration or media inventory. Its single network operation is HTTPS `GET https://api.cloudinary.com/v1_1/<privately-entered-cloud-name>/ping`, with Basic authentication in a header. There is no asset lookup, upload, update, deletion, environment-file read/write, database connection or automatic retry. Redirect following is disabled; TLS verification remains enabled. The request method and endpoint cannot be supplied by the operator. [Cloudinary Admin API authentication](https://cloudinary.com/documentation/admin_api).

Run only this prompt for authentication verification:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/launch05f-auth-prompt.ps1
```

The visible window is titled `RECON IMPORTS LAUNCH-05F-AUTH - PING ONLY`. Enter cloud name twice, then the API key and newly rotated secret from the same enabled entry. Both key and secret are hidden local SecureString inputs. Nothing is requested in chat. Values travel through a redirected stdin pipe, not process arguments or environment files; Unicode is escaped for Windows PowerShell 5 compatibility. Temporary native strings are zeroed/freed, and the key/secret inputs are discarded on completion. Managed runtimes cannot guarantee erasure of every transient memory copy.

Every attempt uses a new current-user/SYSTEM-only, Git-ignored `.local/launch05f/<timestamp>-authentication-<nonce>` directory. `authentication.json` contains only the task, redacted endpoint template, method, outcome/code, HTTP status, request-attempt count, confirmation flag and verification booleans. It contains no actual cloud name, key, secret, Authorization header, raw response/error message or asset data. Original LAUNCH-05F reports remain untouched. Existing report files cannot be reused for a second credential attempt.

An input mismatch returns an explicit sanitized code without a request. HTTP 401 returns `AUTH_FAILED` / `API_HTTP_401`, identifying `CLOUDINARY_ADMIN_PING`; it cannot prove which credential or permission was rejected. Error response bodies/headers are not persisted. HTTP 200 must contain valid bounded JSON with `status: ok` to return `AUTH_VERIFIED`. A success proves that the supplied key/secret authenticate for the supplied cloud name at that time; it does not prove company ownership, upload permissions or content integrity. **Both success and failure stop immediately. No credentials are carried into a later upload process.** A later upload task requires separate owner instruction and its own private credential entry.

## Verification and commit boundary

Focused tests verify the single GET/header, no redirects/retries, credential-free reports, input rejection, 401 behavior, malformed/oversized responses, TLS protection and input disposal. The existing LAUNCH-05F tests remain intact. The shared `launch05a-common.mjs` change only permits the existing protected directory helper to use the LAUNCH-05F scope; it adds no API or database operation.

Live result: **AUTH_VERIFIED**, checked at **2026-11-14 03:04:21 UTC**. The private `authentication.json` records HTTP 200, exactly one GET /ping attempt, matching cloud-name confirmation and a verified credential pair; asset requests, database connections and automatic retries are all zero. The verifier stopped at that result. No credential values were retained. The report is in `.local/launch05f/20261114030224896-authentication-9bb0e9d4/` and remains private and Git-ignored. Earlier failure reports remain intact.

Executed verification: JavaScript syntax check; PowerShell parser check; **38 tests passed, zero failures/skips** across the new eight authentication tests and unchanged LAUNCH-05F/05E/05C/05A tests; TypeScript `--noEmit --incremental false`; Git whitespace check. A read-only file hash comparison against the last LAUNCH-05F preservation baseline matched all **42 environment/upload/migration/backup files**. The authentication process opened no database connection.

```powershell
node --check scripts/launch05f-auth.mjs
node --import tsx --test tests/security/launch05f-auth.test.mjs tests/security/launch05f.test.mjs tests/security/launch05e.test.mjs tests/security/launch05c.test.mjs tests/security/launch05a.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```

The local commit is scoped to the auth module, auth prompt, auth tests, this report and the required protected-directory helper scope. Unfinished LAUNCH-05F upload tooling remains uncommitted. No GitHub push, deployment or DNS change is authorized or performed. Application code is unchanged; no new production/Workers build is required or claimed for this operator-only addition.

Remaining boundary: account authentication is resolved for the privately supplied environment/key pair at the check time. Asset existence, upload permission, HTTPS delivery, checksums and the production mapping remain unverified. Resume those only under separate owner instruction; credentials must be supplied privately again because this verifier discards them.
