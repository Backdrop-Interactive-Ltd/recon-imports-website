# EID-02B employee-domain foundation

No employee screens, public routes, API endpoints, Server Actions, QR rendering,
real employee data, or deployment are part of this implementation.

## Source and model

Six new models are defined in `prisma/schema.prisma`: Employee, Department,
EmployeePublicProfile, EmployeeVerificationIdentity, EmployeePublicationApproval,
and EmployeeAuditEvent. Existing AdminUser gains only inverse Prisma relations;
no existing table gains columns. Existing admin/auth/media/business records are
not backfilled or transformed. Generated Prisma artifacts must accompany schema changes.

Profiles are revisions, not a mutable published row. Drafts are editable;
submission freezes content and records the submitter. Approvals bind an exact
`(employeeId, profileRevision)` composite foreign key, one scope, consent evidence,
field-level contact/portrait flags, reviewer and decision timestamp. The employee's
publicationEpoch is captured at request time. Lifecycle changes invalidate and
withdraw old approvals; rehire/restore cannot resurrect them. New employees start
INACTIVE with a private, empty first draft. Internal names never become public names
automatically. Department presentation is snapshotted into drafts.

## Service boundary and permissions

`lib/employees/services.ts` exports 18 authorized domain mutation functions. The
transaction/locking/audit helpers remain private. No caller-supplied actor, role,
employee code or public key is accepted. Zod objects are strict.

Every service uses the existing requireAdminPermission resolver before processing
input, then locks and rechecks the current database actor inside its transaction.
The actor SHARE lock prevents a concurrent account revocation from committing
halfway through that admitted transaction. Employee operations lock their aggregate
row FOR UPDATE and require an expected aggregate version. Draft saves additionally
require the expected profile version. Department updates condition on their version.
Revision counters are incremented under the aggregate lock, never by MAX/count.

ADMIN may create employees and create/edit/submit/request approval for drafts.
SUPER_ADMIN controls approval, publication, consent withdrawal, status, identity,
archive/restore/erasure and global department taxonomy via employees.policy.manage.
ADMIN may select active departments for drafts but cannot edit global department
definitions. EDITOR cannot invoke mutations. Existing non-employee permissions
and authentication implementation are unchanged.

Department creation/update maintain their own versions/timestamps; they do not
fabricate employee-linked audit events when no employee is the target. Employee
revision snapshots remain unchanged by department rename/deactivation.

## Database safeguards

`20261113143000_add_employee_identity/migration.sql` contains generated additive
DDL followed by reviewed PostgreSQL safeguards:

- Dedicated BIGINT NO CYCLE sequence; unique human employee codes.
- Unique 32-character lowercase hexadecimal verification keys.
- Case-insensitive, trimmed department-name uniqueness and unique slugs.
- Positive aggregate/profile/department versions and profile revisions.
- Partial unique indexes: one editable draft, one live identity, one published
  approval per employee/scope.
- Composite profile FK preventing cross-employee approval binding.
- Required state timestamps, consent references and valid publication combinations.
- Immutable employee codes, revision identity and submitted profile content.
- Terminal retirement, approval withdrawal and personal-data-erasure markers.
- Restrictive employee/profile/identity/approval deletion; no identifier reuse.
- Audit UPDATE/DELETE protection, allowing only nested FK actor-ID SET NULL cleanup.

Profile/reviewer creator/actor references use SET NULL only for admin deletion.
Restricted opaque admin snapshots remain as historical attribution. Submitted
profile erasure is permitted only inside a parent-erasure transaction; normal
edits and returning to DRAFT are rejected. Public query predicates still check
all authoritative state; constraints do not identify which web admin issued SQL.

Application services, not raw database credentials, enforce role policy, documented
consent review, optimistic expected versions and transactional audit creation.
Database owners can bypass/change triggers and grants. A production runtime role
must not own these tables, create triggers, reset the code sequence or mutate audits.
The disposable tests use separate migration-owner and restricted runtime roles.

## Identifiers and transactions

Creation calls nextval and formats RCI- plus at least four digits with no truncation.
Aborted allocations create acceptable gaps. The sequence must never be reset after
issuance. CSPRNG key generation uses 16 random bytes. A unique-key collision retries
the whole authorized transaction at most three times. Live-identity/version conflicts
are not retried as key collisions. All employee transition audits commit atomically
with the transition; audit failure rolls the operation back.

Department and employee locks are not held across uploads or external calls. This
foundation performs no uploads. Transactions have finite timeouts; failures produce
generic domain errors rather than exposing SQL/private field values. Transactions
use LOCAL UTC for adapter date correctness without changing global/legacy connection
configuration. Public reads use the same local UTC convention.

## Publication and lifecycle

SUPER_ADMIN may self-approve. The approval selfApproved flag and matching
REVISION_APPROVED audit event isSelfApproval flag identify that explicitly.
Submitted content is immutable; a new edit creates a new revision. Publication
replacement unpublishes the old scoped row and publishes the new row atomically.
Directory and verification scopes remain independent. Verification publication
requires a non-retired identity. Consent expiry is evaluated at query time without
waiting for a cleanup job. Withdrawal revokes all matching evidence scopes within
the employee aggregate; withdrawn decisions cannot be reactivated.

ACTIVE/INACTIVE/FORMER remain distinct. Every employment-state transition withdraws
existing approvals, advances the publication epoch and records its timestamp.
Archival blocks public eligibility; safe restoration returns INACTIVE with no
publication. Rehire retains the employee code and requires fresh approval.
Retirement retains the key permanently and revokes verification approval; it does
not silently change directory publication or reassign a key.

## Public projections and storage dependency

`publicQueries.ts` executes explicitly selected, parameterized, bounded SQL. It
checks employment, archive/erasure, exact submitted revision, approval scope/state,
epoch, consent validity and identity retirement in the same query snapshot. It
returns only approved presentation/contact fields, the employee code and checkedAt.
No internal name/ID, evidence, admin identity, audit, draft or private portrait key
is returned. Directory queries do not include verification keys. There is no
persistent caching or stale-positive fallback. Database failure throws a generic
unavailable error; unknown/hidden/inactive/former/retired identities return null.

Portrait storage validation, signed delivery and deletion are deliberately deferred.
Non-null portrait assignments and portrait publication are blocked. Public portrait
output remains null. Erasure of a record with portrait references is blocked with
PORTRAIT_STORAGE_PENDING rather than discarding deletion references or claiming
complete media erasure. With no referenced assets, controlled erasure withdraws
approvals, retires identities, archives the record, redacts all profile revisions
and internal personal fields, and clears consent evidence references. Minimal
code/key/revision and safe audit ledgers remain. Erasure is terminal and internal
only; no route/UI exposes it. No automatic deletion or legal retention period exists.

Future public routes must explicitly disable page/CDN/browser stale verification
caching and handle restoration/refresh. No route-level freshness guarantee is
claimed by a query helper alone. Already-open results require a later product/UI
freshness policy. Historical employee disclosure is not enabled.

## Disposable-only validation

`scripts/eid02b-disposable.mjs init` refuses existing manifests/directories. It
creates a brand-new cluster bound to loopback, fresh credentials, an isolated
task-named database and a provenance marker. Test roles are NOSUPERUSER,
NOCREATEDB, NOCREATEROLE, NOREPLICATION. HBA rejects other database targets.
No existing .env connection is read. Private task credentials stay in ignored
`.local/eid02b-target.json`, never command arguments or reports.

The run wrapper validates name/host/port/marker/role privileges before executing
commands and overrides inherited DATABASE_URL. Runtime tests cannot reset the
sequence or UPDATE/DELETE audit rows. They never connect to the existing development
database. All actors and employee/consent data in these tests are synthetic.

Commands used (all Prisma/build commands below via the verified wrapper):

```
node scripts/eid02b-disposable.mjs run prisma validate
node scripts/eid02b-disposable.mjs run prisma migrate deploy
node scripts/eid02b-disposable.mjs run prisma generate
node scripts/eid02b-disposable.mjs run node --import tsx --experimental-vm-modules --test --test-concurrency=1 tests/employees/*.test.mjs
node --experimental-vm-modules --test tests/security/*.test.mjs
npx tsc --noEmit --incremental false
node scripts/eid02b-disposable.mjs run build
```

Existing security integration probes that opt into the pre-existing development
database are left disabled in this task. The unchanged existing security unit suite
is run. New employee tests use real PostgreSQL for invariants, transitions, races,
collision rollback and public projections. Session boundaries are mocked while
current admin records/permissions are actually resolved against the disposable DB.
Only the unavailable-database branch and forced CSPRNG collisions substitute their
external boundaries; pure identifier-format testing does not require PostgreSQL.

## Migration and recovery

The original ten migrations are unchanged and are applied first to the fresh target.
The new migration creates only new tables/enums/sequence/indexes/functions/triggers;
it does not drop/rewrite existing tables or modify existing records. Existing
AdminUser columns and baseline tables are checked by integration tests. Preserve
custom indexes/functions/triggers in migration reviews: they are not all expressed
in Prisma schema syntax.

Do not apply to production/staging/shared/existing development databases under this
task. Before future release, verify drift, PostgreSQL version, runtime grants,
backups/restores and real consent/storage policies. Once identities are issued,
prefer forward fixes and application rollback without dropping identity ledgers or
resetting sequences. Restoring an old backup can resurrect revoked state; reconcile
the identity/revocation ledger before reopening verification. Local integration
success is not production certification.
