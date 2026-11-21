# Team CMS UI simplification — phase 1

> Status clarification ? RCI-GIT-02 (2026-11-21): Historical phase report. The statements below describe that phase only. Since then, employee migrations were applied locally, public team/profile pages and photo/QR functionality were added, and RCI-CF-CPU-03 moved protected history to its own authenticated, paginated page. RCI-CF-CPU-04 verified the current workflows with isolated PostgreSQL integration tests. This report is retained as historical evidence, not current setup instructions.

2026-11-15, Asia/Dhaka. Presentation-only changes on local main; no commit, push or deployment.

## Changes

- Renamed the Admin navigation/list to Team Members, with clearer member filters, permanent ID display, Edit profile links and an empty state.
- Kept the existing two-stage creation contract: enter a private working name, create the identity/draft, then continue to public display name, designation, experience and contact fields. No new create-with-profile transaction or automatic approval was introduced.
- Added the workflow anchors: Team Members → Add/Edit Profile → Save Draft → Review/Publish → Identity/QR → Status.
- Show one editable/current saved profile prominently; older saved versions and optional grouping/display controls are collapsed.
- Kept Save Draft, submit, consent request, approval and publication as separate existing actions. Feedback now explains which step completed and whether publication settings changed. Conflicts provide a manual reload control, never an automatic mutation retry.
- Replaced raw publication scopes with Our Team listing / Public ID profile labels. Consent reference, policy, dates and per-contact choices remain available and required where previously required.
- Approval decisions require the exact submitted snapshot to be loaded in the current revision page as an additional UI safeguard. Backend checks remain authoritative.
- Show permanent identity information plainly. QR download is explicitly disabled, and photo uploads/public team pages are labelled unavailable in this phase.
- Collapsed status changes and manual rejoin selections. Technical approval/revision/audit records remain in permission-protected Advanced history, closed by default.
- Added scoped workflow, disclosure, feedback and responsive styling, plus a clearer error boundary.

## Preserved behavior

No changes to employee services, Server Actions, authorization helpers, permission grants, database queries, schema/migrations, ID allocation, consent validation, resignation/rejoin rules, upload APIs, authentication configuration or local startup scripts in this phase. Hidden concurrency fields and explicit confirmations remain intact. Sensitive evidence/history is not queried or rendered for ADMIN/EDITOR users.

The normal localhost:3000 development server and recon_local remain selected. No disposable database was used, started or switched to. Existing unrelated uncommitted startup changes and generated tsconfig changes were left untouched.

## Verification

- `node --experimental-vm-modules --test tests/security/teamCmsPresentation.test.mjs tests/security/adminAuthorization.test.mjs tests/security/adminRedirect.test.mjs`: 15 passed, 0 failed. All database/session/query/action boundaries are mocked; no database records are written by these checks.
- `npx tsc --noEmit --incremental false`: passed.
- `git diff --check`: passed.
- The retained read-only owner-data preservation check confirms unchanged recon_local rows, .env, migration files and original uploads.
- No production build or interactive employee flow was run. The original database intentionally has no employee tables, and this task does not authorize schema changes or a database switch. Actual employee create/save/publish tests therefore remain unverified in this environment. Presentation is verified through synthetic rendered markup only; no synthetic records were inserted.

## Files in this phase

- `app/admin/(dashboard)/AdminNav.tsx`
- `app/admin/(dashboard)/employees/page.tsx`
- `app/admin/(dashboard)/employees/new/page.tsx`
- `app/admin/(dashboard)/employees/[employeeCode]/page.tsx`
- `app/admin/(dashboard)/employees/EmployeeForms.tsx`
- `app/admin/(dashboard)/employees/page.module.css`
- `app/admin/(dashboard)/employees/error.tsx`
- `tests/security/teamCmsPresentation.test.mjs`
- This report.

The root cause of the earlier database confusion is not worked around by these UI changes. No fake team rows, silent fallback publication, automatic migrations or environment overrides were added.
