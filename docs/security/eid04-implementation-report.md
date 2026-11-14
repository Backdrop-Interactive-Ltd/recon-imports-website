# EID-04 — Employee Management Admin UI

Date: 2026-11-14, Asia/Dhaka. Local implementation only; no deployment or GitHub push.

## Implemented scope

- `/admin/employees`: permission-protected list, employee-code search, ALL/ACTIVE/INACTIVE/RESIGNED/ARCHIVED filters and bounded pagination. Archived includes resigned records, matching EID-03 queries.
- `/admin/employees/new`: creates the permanent identity and initial unpublished draft through `createEmployee`; no Admin account/password is created. Internal name is creation-only in this UI.
- `/admin/employees/[employeeCode]`: bounded revision pages, draft editing, submission, scope-specific consent requests, SUPER_ADMIN review/approval/rejection, publication/unpublication, activation, resignation, rejoining and protected audit history.
- Consent renewal after resignation supports a new evidence reference and explicit selection of the newly approved revision for rejoining. The default rejoin uses the service's saved resume plan. Choosing scopes manually restores only those selected scopes.
- Conditional Employees navigation, generic error boundary, responsive scoped CSS, labelled controls, confirmation checkboxes, pending-state controls, keyboard focus and live action feedback.

No portrait uploads/storage, public team/profile routes, QR/cards, archive/erasure mutation screens or department-management UI were added. Existing active departments are selectable (up to 100); an employee can be created without a department. Existing employee profile paths are shown as text, not links to unimplemented public pages.

## Security and lifecycle preservation

All mutations delegate to unchanged EID-03 domain services. No Prisma mutations occur in the UI wrappers. Existing live actor checks, transactional permission rechecks, row locks, expected employee/profile versions, immutable submitted snapshots, audit writes, consent and employment-epoch checks remain authoritative.

SUPER_ADMIN retains approval/publication/lifecycle access. ADMIN can read records and create/edit/submit drafts and approval requests, but cannot review restricted evidence/history or perform privileged operations. EDITOR cannot enter private employee screens. Every exported Server Action checks authorization before parsing input; direct calls do not depend on navigation visibility.

New editor queries whitelist fields, bound pagination, recheck permissions inside their transaction and return no opaque identity keys, portrait storage keys or raw audit actor identifiers. Consent evidence references and history require `employees.restricted.read`. Server Actions return only small status results, never complete employee/approval records. Errors are mapped to generic safe messages. Existing admin no-store headers and dynamic rendering are retained; no persistent authorization/publication cache was added.

Initial activation changes the publication epoch. The UI therefore guides initial activation before requesting new approvals. A resigned employee can obtain renewed consent/approval for an explicit rejoin selection. Activation never publishes; rejoining publishes only service-validated frozen revisions. Withdrawal is terminal for its consent reference. Submitted revisions cannot be edited, and a newer draft never replaces a published snapshot implicitly. Historical epochs and expired/withdrawn evidence are flagged in review.

Archived records are read-only apart from the existing rejoin service. If an archived employee has no eligible approved consent, rejoining remains blocked; a separately scoped restoration/consent workflow may be needed. No lifecycle rule was bypassed to enable a button.

## Disposable database and preservation

The new `scripts/eid04-disposable.mjs` wrapper selects only an EID-04 manifest/cluster. Its shared runner validates the target name, task directory, loopback URL/port, database marker and unprivileged task roles before each command. It never selects `.env` as a command target. The existing fixture/build-isolation allowlists now recognize EID-04 without removing prior checks.

Fresh test database: `eid04_dfff1dfcf195`, loopback port `65496`, PostgreSQL 18.6. All twelve unchanged migrations were applied in order, including `20261113143000_add_employee_identity` and `20261113180000_align_employee_lifecycle`. Only disposable synthetic records/permissions were written. Existing tests also rehearse old-code bootstrap in a separate schema inside this disposable database.

Before/after read-only fingerprints compare all rows in all 18 original owner public tables (including migration history), `.env`, twelve migration SQL files and all four original uploads. The original `recon_local` remains on ten migrations with no employee tables. No schema, migration, credential or environment-file changes were made to that database or production. Existing backups remain intact.

## Executed verification

- Employee domain/database suite: 28 existing tests plus six new EID-04 tests passed. New coverage exercises real action wrappers and PostgreSQL runtime queries, scope-specific contacts, immutable submitted revisions, draft privacy, stale-version failure, authorization/mass-assignment attempts, consent renewal/withdrawal, resignation/rejoin, restricted DTOs/history, role-downgrade races, rendered role-specific screens and outage sanitization.
- Shared authorization/redirect tests: 11 passed; action/page inventory assertions now include the new two actions and three pages.
- Build-isolation metadata tests: two passed. Their deliberate unrelated-edit fixture emits its expected preservation warning.
- Existing CI/apex safety tests: five passed.
- TypeScript: passed through the verified EID-04 runner.
- Standard Next.js production build and OpenNext Workers production build: passed. The Workers command includes artifact credential/upload exclusion checks and Wrangler's upload dry run; nothing was deployed.
- Browser interaction/screenshots: **not verified**. Automatic approval review rejected launching the local browser test server (`blocked by policy`, no more specific reason provided). No alternate launch or browser test was attempted. Role-specific rendered markup and action/database integration were tested instead; those do not establish full browser coverage.

Commands used include:

```text
node scripts/eid04-disposable.mjs init
node scripts/eid04-disposable.mjs run prisma migrate deploy
node scripts/eid04-disposable.mjs run prisma generate
node scripts/eid04-disposable.mjs run node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/employees/adminUi.test.mjs tests/employees/domainServices.test.mjs tests/employees/eid03Bootstrap.test.mjs tests/employees/identifiers.test.mjs tests/employees/lifecycleAlignment.test.mjs tests/employees/publicationPolicy.test.mjs tests/employees/schemaIntegrity.test.mjs
node --experimental-vm-modules --test tests/security/adminAuthorization.test.mjs tests/security/adminRedirect.test.mjs
node --experimental-vm-modules --test --test-name-pattern="favicon fallback|isolated builds restore" tests/persistence/persistence.test.mjs
node --test tests/security/workersCi.test.mjs tests/security/apexRedirect.test.mjs
node scripts/eid04-disposable.mjs run node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/eid04-disposable.mjs run build
npm run build:workers
```

The root test database had no original owner data copied into it. Synthetic browser accounts were prepared privately but never used in a browser because the server launch was rejected. Private manifests, fingerprints, logs and synthetic credentials remain under Git-ignored `.local/eid04*`; none belong in the commit. No screenshots were produced.

## Files

Created:

- `app/admin/(dashboard)/employees/page.tsx`
- `app/admin/(dashboard)/employees/new/page.tsx`
- `app/admin/(dashboard)/employees/[employeeCode]/page.tsx`
- `app/admin/(dashboard)/employees/EmployeeForms.tsx`
- `app/admin/(dashboard)/employees/actions.ts`
- `app/admin/(dashboard)/employees/formState.ts`
- `app/admin/(dashboard)/employees/page.module.css`
- `app/admin/(dashboard)/employees/error.tsx`
- `scripts/eid04-disposable.mjs`
- `tests/employees/adminUi.test.mjs`
- This report.

Modified:

- `app/admin/(dashboard)/AdminNav.tsx`
- `lib/employees/adminQueries.ts`
- `scripts/eid02b-disposable.mjs`
- `scripts/build-isolation.mjs`
- `tests/employees/fixture.mjs`
- `tests/security/adminAuthorization.test.mjs`
- `tests/persistence/persistence.test.mjs`

No dependencies, schema/migration files, application auth policy, inventory behavior or deployment configuration changed. Generated build/Prisma files are ignored.

## Local checkpoint and limitations

Commit only reviewed EID-04 source/tests/documentation after final checks; the completion response records the hash. Main-only automatic deployment is already enabled remotely, so this local checkpoint must not be pushed without separate owner authorization. No new production writes, Cloudflare operations, DNS, billing, uploads or secrets changes were performed.

The existing Workers Free login CPU limitation remains separate and unresolved. Passing these local Node/Workers builds is not a production authentication or employee-write certification. The original local database intentionally lacks employee migrations; do not use it for EID-04 mutations or automatically migrate it. Browser verification remains outstanding as stated above.
