# EID-02B validation evidence

Date: 2026-11-13. This is local evidence, not production certification.

## Isolated target

- Database: `eid02b_a27fce648a76`.
- Host classification: brand-new, dedicated loopback-only PostgreSQL cluster.
- Port: `52544`; separate from the existing development instance.
- Private connection source: ignored `.local/eid02b-target.json`, created with fresh
  random credentials; no existing `.env` URL was used to provision or mutate it.
- Cluster directory: `.local/eid02b/a27fce648a76/postgres`.
- Database marker: task-specific random provenance comment, verified by the run wrapper.
- Test/migration role and runtime role: neither superuser, database creator, role
  creator nor replication role. HBA accepts these roles only for this database.
- Integration test verifies a runtime connection to the cluster's postgres database
  is rejected. The runtime cannot reset the sequence or mutate audit history.
- Production, staging, shared and existing development databases received no migration
  or data mutation from this task. No real employee records were used.

## Commands and results

All database-aware Prisma/build commands were run through
`node scripts/eid02b-disposable.mjs run ...`, which verifies provenance and overrides
DATABASE_URL before starting the child process. Next/Prisma may mention `.env`
loading; the explicitly supplied target remains authoritative.

1. `prisma validate`: passed, initially with a non-connectable source-validation
   placeholder, then with the verified isolated target.
2. `prisma migrate deploy`: original ten baseline migrations passed before adding
   the new migration directory.
3. `prisma migrate diff --from-schema .local/eid02b-before.prisma --to-schema prisma/schema.prisma --script --output prisma/migrations/20261113143000_add_employee_identity/migration.sql`:
   generated additive SQL; reviewed and extended with PostgreSQL safeguards.
4. Static SQL review rejected existing-table ALTER/DROP/TRUNCATE/data-update forms;
   none were present. New child FKs reference existing AdminUser without altering it.
5. `prisma migrate deploy`: the new employee migration passed; eleven migrations
   present in the disposable target.
6. `prisma generate`: passed with installed Prisma 7.8.0.
7. `node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/employees/*.test.mjs`:
   20 passed, 0 failed, 0 skipped. Nineteen tests use real disposable PostgreSQL;
   one verifies pure identifier formatting/source choices.
8. `node --experimental-vm-modules --test tests/security/*.test.mjs`:
   9 passed, 0 failed, 3 existing opt-in development-DB/HTTP probes skipped.
9. `npx tsc --noEmit --incremental false`: passed.
10. `build` through the wrapper (same Next production build as npm run build):
    compiled, type-checked and generated all 59 static pages successfully.

The unchanged pre-existing `next lint` script is unsupported; no lint configuration
or dependency versions were changed.

## Real PostgreSQL coverage

Tests verify unique codes/keys, case-insensitive departments, partial indexes,
composite ownership FK, immutable submissions, terminal retirement/withdrawal,
restrictive deletion, audit tamper denial and legitimate admin FK cleanup.

Domain tests execute actual services and current-admin database resolution against
the restricted runtime role. Only the session boundary is substituted so tests do
not require real credentials. Forced CSPRNG collisions substitute random output,
but actual unique violations, transaction retries and rollback occur in PostgreSQL.
Unavailable-query tests substitute a failed database boundary and assert no fallback.

Concurrency tests cover eight simultaneous employee creations, competing live-key
issuance, two draft saves, two publication attempts, publication replacement,
status-versus-publication and consent-withdrawal-versus-publication. A losing stale
request receives a conflict; tests retry revocation with the current version and
verify no positive result remains after revocation commits. Audit-permission failure
is used to prove rollback of creation and atomic publication replacement.

## Failures addressed during development

- Node CJS/ESM test import: `does not provide an export named 'Prisma'`; the test
  fixture now uses the existing tsx require loader for generated client exports.
- A source assertion matched Zod's `.max()` validator; it was narrowed to employee
  code-allocation code rather than unrelated validators.
- Consent-expiry test: `Publication is not currently eligible` exposed adapter/session
  timezone disagreement. Domain and public-read transactions now use LOCAL UTC;
  real expiry tests pass with the cluster otherwise retaining its timezone.
- PostgreSQL 18 restrictive-delete error used SQLSTATE 23001 rather than 23503;
  tests and generic domain-error classification now recognize both.

## Limits

No public routes, browser employee UI, physical QR scans or production integration
were tested because none are implemented or authorized in this phase. Private
portrait delivery/deletion is deferred and explicitly blocked rather than simulated
as complete. Database owners and out-of-band SQL are outside web-admin RBAC; runtime
grants must be reviewed for future production deployment. No legal retention period
is selected and no automatic permanent deletion is introduced.
