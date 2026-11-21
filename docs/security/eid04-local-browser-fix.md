# EID-04 local browser routing fix — 2026-11-15

> Status clarification ? RCI-GIT-02 (2026-11-21): Historical incident report. Its database/table counts, HEAD, process IDs and uncommitted status describe that incident only. Current normal startup is npm run dev on localhost:3000 using recon_local; dev:local remains equivalent. All twelve local migrations were verified in RCI-CF-CPU-04. EID-04 disposable mode is optional and must not replace the owner environment. RCI-GIT-02 tracks the required startup helpers and tests; no database or server changes are performed by this documentation update.

## Confirmed cause

Two Next.js processes listened on port 3000: the normal `dev-local` server on IPv6 `::` and EID-04 on IPv4 `127.0.0.1`. Process ancestry identifies the runners separately. The normal server had eight established connections to the owner `recon_local` PostgreSQL port; its development log reports `prisma.employee.findMany(): The table public.Employee does not exist in the current database`, followed by the safe UNAVAILABLE boundary. The EID-04 development log had no corresponding failure.

The isolated database is reachable and has all twelve migrations. A direct IPv4 request using a synthetic disposable SUPER_ADMIN authenticated successfully, then rendered `/admin/employees` with HTTP 200 and the employee table, without the unavailable boundary. That login's redirect origin was `http://localhost:3000`, inherited from the ordinary local authentication configuration. Resolving localhost to IPv6 sends the browser to the other process/database. No missing migration or query permission problem was found in the isolated target.

## Permanent standard development configuration

EID-04 uses the standard local URL through its isolated runner:

```powershell
node scripts/eid04-disposable.mjs dev
```

Next.js, AUTH_URL and NEXTAUTH_URL all use `http://localhost:3000`. Alternative port/hostname arguments are refused. The disposable runtime role and existing task/directory/URL/marker/privilege checks are retained; no .env change is required. The former separate-port workaround has been removed.

`npm run dev`, `npm run dev:local` and EID-04 dev share the same origin and conflict guard. They cannot be run concurrently on different address families. A conflicting listener is inspected through Windows process metadata. Only this project's Node/Next **development** process ancestry is eligible for termination. Unrelated/unverified listeners cause refusal. An interactive operator must type STOP; non-interactive launches cannot approve shutdowns. The guard rechecks process creation times and exact members before stopping them, rejects PID reuse, and never selects PostgreSQL, terminal/editor processes or production Next.js servers.

The owner explicitly approved stopping the original two conflicting Next.js trees (listeners 23812 and 20160). Fresh identity checks matched that scope. Stopping verified Node launchers 2728 and 6864 caused their corresponding children/wrappers to exit; both PostgreSQL instances stayed available. The corrected EID-04 server was then started normally through the command above. No blocked browser automation or production-mode server-launch method was retried.

Open `http://localhost:3000/admin/login?callbackUrl=/admin/employees`, then `http://localhost:3000/admin/employees`. Use only synthetic disposable accounts and their privately retained test password. Restarting the isolated server generates a new test auth secret, so sign in again. Normal and EID-04 development are alternative modes on this one URL: `npm run dev:local` uses the ordinary local database, while EID-04 dev selects only its disposable manifest.

No application authentication policy, employee query, role grant, schema, migration or .env file is changed by this fix. The pre-existing tsconfig.json change contains Next-generated EID-04 type-directory includes and is left untouched. No commits, pushes, deployments or production operations are authorized.

## Verification

Four Node launcher tests passed, covering consistent localhost origins, restricted runtime selection, rejected overrides, IPv4/IPv6 port conflicts, unverified listeners and unconfirmed shutdown refusal. Native PowerShell tests with mocked OS operations passed confirmation, project/dev scoping, terminal exclusion, PostgreSQL/production/unrelated-process exclusion and PID-reuse cases. Existing authorization/redirect tests: eleven passed. TypeScript passed.

Live HTTP checks against localhost:3000 verified successful synthetic SUPER_ADMIN, ADMIN and EDITOR login, session-cookie issuance and localhost-only callbacks. Employee list, create form and detail pages returned 200 for SUPER_ADMIN/ADMIN; restricted history was visible only to SUPER_ADMIN. EDITOR received 307 to /admin. These requests performed no application-record writes. This is HTTP/session verification, not interactive browser automation.

The original owner database's 18 table fingerprints, .env, all original uploads and migration files still match the preserved baseline. Both PostgreSQL listeners remained available. HEAD remains 097e52d; changes are uncommitted and unpushed. No production, DNS, billing or deployment operations were performed.
