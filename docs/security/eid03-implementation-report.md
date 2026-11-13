# EID-03 implementation report

Date: 2026-11-13. Scope: employee backend/domain alignment only.

## 1. Executive summary

Implemented permanent official employee codes and canonical URL helpers, business status mapping, reversible resignation, transactional rejoin/republication, protected archive queries, and minimized public query states. Existing employee records, immutable identifiers, approval history, opaque keys, authorization, and audit controls remain in place. No employee UI or routes were created.

## 2. Files created

- `lib/employees/status.ts`
- `lib/employees/profileUrls.ts`
- `lib/employees/adminQueries.ts`
- `prisma/migrations/20261113180000_align_employee_lifecycle/migration.sql`
- `scripts/eid03-disposable.mjs`
- `tests/employees/eid03Bootstrap.test.mjs`
- `tests/employees/lifecycleAlignment.test.mjs`
- `docs/security/eid03-implementation-report.md`

Ignored local test infrastructure was also created under `.local/eid03/` and `.local/eid03-target.json`. The latter contains private isolated credentials and must remain ignored and undistributed.

## 3. Files modified

- `prisma/schema.prisma`: one employee resume-plan array; existing enum retained.
- `lib/employees/identifiers.ts`: official formatting and legacy-aware validation.
- `lib/employees/services.ts`: allocation, lifecycle suspension and rejoin orchestration.
- `lib/employees/publicQueries.ts`: team alias and code-based public result states.
- `scripts/eid02b-disposable.mjs`: shared runner selects an independently provisioned EID-03 target when invoked by its wrapper; default EID-02B behavior retained.
- `tests/employees/fixture.mjs`: accepts the verified new target and grants synthetic runtime access to the new sequence.
- `tests/employees/identifiers.test.mjs`: official format/allocation assertions.
- `tests/employees/domainServices.test.mjs`: includes both new mutation entry points in authorization regression checks.
- `tests/employees/schemaIntegrity.test.mjs`: new migration count and new-sequence reset denial.

`prisma generate` regenerated `lib/generated/prisma/`. Schema-content changes appear in `internal/class.ts`, `internal/prismaNamespace.ts`, `internal/prismaNamespaceBrowser.ts`, and `models/Employee.ts`; other generator outputs were regenerated normally. Build/TypeScript outputs are local generated artifacts. No unrelated application source, inventory/admin routes, dependency manifests, or environment files were intentionally changed. There is no Git repository in this workspace, so a Git-based baseline diff was unavailable.

## 4. Final employee ID format

New codes are `RI-EMP-101`, `RI-EMP-102`, and onward without truncation or padding. `identifiers.ts::formatEmployeeCode` rejects values below 101. Employee create input remains strict and accepts no supplied employee code.

## 5. Sequence allocation strategy

`services.ts::createEmployee` obtains every new allocation through PostgreSQL `nextval('recon_employee_official_code_seq')`. The BIGINT sequence starts at 101 and is non-cycling. Runtime allocation uses no count, maximum, or application-side increment. Rollback can leave a gap; it cannot recycle an allocated value.

The migration creates a **new unused sequence**. Its one-time compatibility bootstrap considers the old sequence's consumed high-water mark and existing numeric code suffixes, with a minimum preceding value of 100. Only the newly created sequence is initialized; `recon_employee_code_seq` is never reset. Unknown code formats or exhausted BIGINT ranges fail the migration for explicit review.

Evidence: `eid03Bootstrap.test.mjs` verified actual service issuance of 101 and 102 in the initially empty target. Repeated runs verify those initial ledger rows. `identifiers.test.mjs` verifies concurrent creation and source allocation strategy. `schemaIntegrity.test.mjs` verifies immutable code, unique constraints, deletion prevention, and runtime reset denial for both sequences.

## 6. Existing identifier compatibility

Read-only inspection of the previously authorized EID-02B disposable target found 106 synthetic employee rows, legacy `RCI-` codes, and old sequence value 108 with `is_called=true`. That target was not mutated during EID-03.

Legacy codes remain valid and immutable. No previous migration was rewritten. `eid03Bootstrap.test.mjs` reconstructs all eleven prior migrations inside a new schema of the EID-03 disposable database, consumes 109 old allocations, inserts `RCI-0500`, applies the new migration, and verifies the legacy code and old sequence remain unchanged while the next new allocation is 501.

Production/staging/shared/development issuance is **Not Verified**. Disposable fixtures do not establish whether production has issued identifiers. Before any future rollout, review real allocation provenance, use a controlled maintenance window that prevents legacy/new writers overlapping the bootstrap, back up, and review runtime grants. No rollout is authorized or performed here.

## 7. Permanent URL strategy

`profileUrls.ts::getEmployeeProfilePath/getEmployeeProfileUrl` build `/team/{employeeCode}` and its absolute URL using existing `lib/seo.ts::siteUrl`. The helpers accept immutable legacy codes too. No new production domain was invented or configured. Deployment-domain ownership/confirmation remains outside this task.

Evidence: the lifecycle test verifies the URL before and after profile draft creation, resignation and rejoin; code immutability is independently enforced and tested at the database layer. QR images and actual destination routes remain deferred.

## 8. Resignation behavior

`services.ts::resignEmployee` delegates to the guarded status transition. Business `RESIGNED` maps to existing DB `FORMER`. Published scopes are suspended; the exact approval IDs are retained in `reactivationApprovalIds`. Epoch/version increments and audit insertion are transactional. Employee/profile/identity records are retained. Keys are not retired or replaced. Public queries hide profile data immediately on the next read.

Evidence: `lifecycleAlignment.test.mjs` verifies private revision counts, original live key, absence from team results, a state-only resignation result and `STATUS_CHANGED:RESIGNED` audit history.

## 9. Rejoining behavior

`services.ts::rejoinEmployee` locks the same employee, checks expected version, and requires current SUPER_ADMIN permissions. It uses saved previously published approval IDs or an explicit bounded SUPER_ADMIN selection. It checks approved frozen submitted revisions and current unwithdrawn consent, then activates/unarchives the same employee, increments the epoch, creates new approval decisions bound to that epoch, and publishes them in the same transaction. It creates no employee, profile revision, or identity key.

Old approval decisions remain historical records; withdrawn records are never revived. Unapproved drafts are never selected. Missing approval gives `APPROVAL_REQUIRED`; missing/future/erased evidence gives `CONSENT_REQUIRED`; expired evidence gives `CONSENT_EXPIRED`; withdrawn evidence gives `CONSENT_WITHDRAWN`. The future UI should direct the operator to obtain current consent or approve a submitted revision before retrying. An already active unarchived employee is not a rejoin operation.

Evidence: lifecycle tests verify same record/code/URL/key/history, approved information restored despite a newer private draft, no-key rejoin, invalid consent rollback and audit-failure rollback. Database-invalid missing approved evidence cannot normally be stored because existing checks prevent it; that defensive branch is not claimed as a separately exercised database scenario.

## 10. Employee archive foundation

`adminQueries.ts::listEmployeesForAdmin` supports ALL, ACTIVE, INACTIVE, RESIGNED and ARCHIVED, bounded pagination and employee-code search. ARCHIVED includes both explicitly archived records and resigned records. `getEmployeeByCode` returns a bounded private ledger DTO, business status and canonical URL. It does not return evidence, opaque keys, audit history or profile drafts. Future editing UI can use the existing guarded revision services.

Evidence: the archive authorization test covers ADMIN reads, EDITOR denial, disabled accounts and downgraded SUPER_ADMIN mutations; the lifecycle test verifies resigned archive retrieval.

## 11. Publication/consent compatibility

Lifecycle suspension differs from terminal consent withdrawal. Manual status activation alone does not republish an old epoch. Rejoin creates new approval records for the exact approved frozen revision. Scope/contact flags are preserved. Any withdrawn approval sharing the selected consent reference blocks rejoin; renewed consent should have a distinct evidence reference.

The replaced approval trigger allows old APPROVED decisions to remain unpublished after an epoch change. New approval decisions and all publication still require current epochs. Submitted content, consent snapshots, decisions, terminal withdrawal, and one-published-approval-per-scope constraints remain enforced. Canonical VERIFICATION-scope publication no longer requires an opaque key. Existing opaque lookup still requires its live original key.

Evidence: existing `publicationPolicy.test.mjs`, `schemaIntegrity.test.mjs`, old lifecycle regression, and new rejoin/consent tests all pass. Public reads recheck employment, archive/erasure, frozen revision, publication, scope, epoch and consent rather than caching eligibility.

## 12. Authorization controls

`services.ts::run` uses EID-01 `requireAdminPermission`, then locks/rechecks the actual AdminUser role/isActive inside the mutation transaction. Every lifecycle mutation takes the employee row lock and checks the aggregate expected version. `rejoinEmployee` also requires approval and both publication permissions. No actor or trusted role is accepted from input. `resignEmployee` performs authorization before parsing and calls the same transactional status service.

`adminQueries.ts::read` applies the existing records-read permission and an in-transaction account recheck. EDITOR can use public approved queries but cannot enter private/archive reads. Existing role definitions were not modified.

Evidence: `domainServices.test.mjs` checks every exported mutation against anonymous/deleted/disabled/EDITOR actors, stale role claims, mass assignment and ADMIN restrictions. `lifecycleAlignment.test.mjs` adds archive/rejoin/downgrade checks. `tests/security/adminAuthorization.test.mjs` passes all nine existing regressions for the shared authorization layer.

## 13. Public profile query behavior

`publicQueries.ts::getPublicEmployeeProfile` uses a single parameterized SQL statement and returns:

| Condition | Result |
|---|---|
| ACTIVE, current approved published VERIFICATION revision and valid consent | `{ state: 'ACTIVE', profile: whitelistedDTO }` |
| RESIGNED, including archived resigned records | `{ state: 'RESIGNED' }` |
| INACTIVE, archived active, erased, or approval unavailable | `{ state: 'UNAVAILABLE' }` |
| Unknown/invalid code | `{ state: 'NOT_FOUND' }` |

Erasure takes precedence over resignation. Non-active results contain no personal fields, portrait, contacts, internal IDs or employment history. `getPublicTeamMembers` reuses the existing DIRECTORY query. Phone/email require scope approval flags; portraits remain null. No persistent cache or stale-positive fallback was added. Database errors produce a generic query error.

Evidence: lifecycle tests assert exact state-only results, unknown/invalid code handling, contact minimization, and draft/internal-field exclusion. Existing public-query regressions verify consent expiry, key retirement, withdrawal and database failure behavior.

## 14. Database changes

One additive migration creates the official sequence, adds `Employee.reactivationApprovalIds TEXT[]`, widens the employee-code check for both supported formats, and replaces the existing approval trigger function as described above. The DB employment enum and all existing tables/keys/history remain intact. No deletion, enum rename, schema reset, `db push`, or prior migration rewrite occurred. Migration deployment ran only in the new disposable target.

## 15. Disposable database isolation evidence

- Target: `eid03_7d37bfe04943`, `127.0.0.1:55279`.
- Provenance: freshly initialized embedded PostgreSQL 18.6 cluster in a new task-specific directory; random database suffix, marker and credentials.
- Connection source: ignored `.local/eid03-target.json`; existing `.env` DATABASE_URL is not selected by the runner.
- The runner validates task/name/directory, loopback host, port, database path, database marker, and owner privilege flags before commands.
- Fresh isolated owner/runtime credentials. The role labels remain `eid02b_test`/`eid02b_runtime` for fixture compatibility; they are different accounts in a different cluster with independent credentials.
- Both test roles are non-superuser and cannot create databases/roles or replicate. HBA permits these roles only to this database; other loopback database targets are rejected. Runtime has sequence USAGE/SELECT, not reset privileges, and cannot update/delete audit events.
- All EID-03 database mutations and compatibility schemas were inside this newly verified cluster. Production, staging, shared, existing development, and previous EID-02B databases were not migrated or mutated.

Evidence: runner initialization/verification logs and `schemaIntegrity.test.mjs` connection/reset/audit denial tests. Next/Prisma report loading `.env` normally, but the child-process DATABASE_URL override already points to the disposable target and takes precedence. No credentials or secret environment values are included here.

## 16. Tests executed and results

Commands executed from the repository root:

```powershell
node scripts/eid03-disposable.mjs init
node scripts/eid03-disposable.mjs run prisma migrate deploy
node scripts/eid03-disposable.mjs run prisma validate
node scripts/eid03-disposable.mjs run prisma generate
node scripts/eid03-disposable.mjs run node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/employees/eid03Bootstrap.test.mjs tests/employees/identifiers.test.mjs tests/employees/schemaIntegrity.test.mjs tests/employees/publicationPolicy.test.mjs tests/employees/domainServices.test.mjs tests/employees/lifecycleAlignment.test.mjs
node scripts/eid03-disposable.mjs run node --import tsx --experimental-vm-modules --test tests/security/adminAuthorization.test.mjs tests/security/postgresLock.test.mjs tests/security/httpSmoke.test.mjs
node scripts/eid03-disposable.mjs run node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/eid03-disposable.mjs run build
```

Final results: employee **28 passed, 0 failed, 0 skipped**; shared security **9 passed, 0 failed, 3 skipped**. Prisma migration deployment, validate and generate passed. Tests use the actual generated Prisma client, adapter, SQL constraints and services against PostgreSQL, with auth-session boundaries supplied by the existing harness. They are not end-to-end HTTP tests. One initial lifecycle run failed due to cross-VM object prototypes in deep-equality assertions; assertions were corrected to compare serialized safe DTOs, then the full final suite passed.

## 17. Concurrency test results

Passed actual PostgreSQL checks for eight concurrent official-code allocations; competing identity issuance; unique-key collision transaction retries; competing draft saves; publication replacement; status/consent races; concurrent status transitions; resignation/publication; and rejoin/profile-edit races. Same-version conflicting employee operations admit one winner and return CONFLICT for the loser. Forced audit insert failure rolls back rejoin activation and newly created approvals together.

Evidence: `identifiers.test.mjs`, `domainServices.test.mjs`, `lifecycleAlignment.test.mjs`. These are bounded integration exercises, not load/stress testing.

## 18. Existing security regression results

All nine existing shared authorization tests passed. Three opt-in existing HTTP/account-lock probes were skipped because their hardcoded target is the existing `recon_local` development database; enabling them would violate this task's isolation rule. Those test files and flags were not altered. New employee row-lock and permission assertions ran on the disposable target as described above. No existing-development HTTP smoke result is claimed.

## 19. TypeScript results

`tsc --noEmit --incremental false`: passed, exit 0. Production build's TypeScript stage also passed. No lint configuration was changed. The existing `lint` script uses `next lint`, which is not an available Next 16 command; it was not used as evidence of success.

## 20. Production build results

Next 16.2.6 production build: passed, exit 0; compiled, type-checked and generated 59 pages. This was local validation with the disposable DATABASE_URL, not deployment. No employee routes appear in the build because they are intentionally deferred. The pre-existing local dev server was stopped during the build to avoid shared artifact contention and restored afterward at `http://localhost:3000`.

## 21. Remaining risks

- Production identifiers, data volume, runtime grants and official-domain confirmation are Not Verified. Review before any separately authorized rollout; prevent old allocator writes during migration bootstrap.
- Existing development DB deliberately remains on its previous schema. Employee foundation services require the new migration on whichever future target is authorized to use them.
- BIGINT sequences permit gaps and eventually exhaust; no resets or reuse are supported.
- Rejoin requires a previously approved revision and valid consent. A new/inactive employee with no approval needs the existing submit/approve/publish workflow first.
- The resume-plan array stores internal approval IDs and is server-managed; clients cannot set it through strict mutation schemas. It is not a substitute for approval/consent checks.
- Future HTTP routes must preserve live query/no-store behavior and turn generic database errors into unavailable responses. No future page may expose private ledger DTOs.
- No UI/browser verification applies to this backend-only task. No production warning text has been published or legally reviewed here.
- No Git baseline was available to certify all pre-existing workspace differences.

## 22. Deferred UI/QR dependencies

Admin employee screens, `/team`, `/team/[employeeCode]`, photo storage/upload, QR generation/download, digital card display/sharing/export, and resignation warning UI remain unimplemented. Future QR generation should use `getEmployeeProfileUrl`; existing opaque-key destinations need an explicit compatible route decision. Warning wording needs final business/legal review. No payroll/attendance/HR work was added.

## 23. Dependencies installed

NONE. Existing dependencies and lockfile were retained.

## 24. Deployment status

NOT DEPLOYED. No production/staging/shared/existing-development migration. No EID-04 work started.

## 25. Final status

**COMPLETE — EID-03 backend/domain scope.** All requested quality gates passed with the three explicitly isolated-out legacy opt-in probes reported above. Ready for project-controller review; future UI and production adoption remain separate tasks.
