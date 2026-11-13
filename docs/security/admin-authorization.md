# EID-01 authorization foundation

## Verified inventory and previous behavior

The dashboard layout and eleven action modules previously checked only session
presence (users actions also checked for a session user ID). The users page did
not restrict management by role. The upload POST route checked only session
presence. No explicit role restrictions were found in these entry points.

All sixteen dashboard pages now check their own permission before starting their
body's queries, in addition to the layout guard. All thirty-four exported action
functions check the server guard before reading inputs or mutating data.

| Module | Server Actions | Required permission |
| --- | --- | --- |
| users | createAdminUserAction, updateAdminUserAction, setAdminUserActiveAction, deleteAdminUserAction | adminUsers.manage |
| cars | createCarAction, updateCarAction, setCarPublishedAction, setCarFeaturedAction, setCarSaleStatusAction, deleteCarAction | inventory.manage |
| brands | createBrandAction, updateBrandAction, setBrandActiveAction, deleteBrandAction | brands.manage |
| categories | createCategoryAction, updateCategoryAction, setCategoryActiveAction, deleteCategoryAction | categories.manage |
| homepage | createHeroSlideAction, updateHeroSlideAction, setHeroSlideActiveAction, deleteHeroSlideAction | homepage.manage |
| sell-car-leads | updateSellCarLeadStatusAction, deleteSellCarLeadAction | leads.manage |
| requirement-leads | updateRequirementLeadStatusAction, deleteRequirementLeadAction | leads.manage |
| auction-sheet-requests | updateAuctionSheetStatusAction, updateAuctionSheetPaymentStatusAction, updateAuctionSheetReportUrlAction, deleteAuctionSheetRequestAction | auction.manage |
| newsletter | setNewsletterSubscriberActiveAction, deleteNewsletterSubscriberAction | newsletter.manage |
| media | deleteMediaRecordAction | media.manage |
| site-settings | updateSiteSettingsAction | settings.manage |
| /api/admin/uploads | POST | uploads.create |

The upload route has no other implemented HTTP methods. Auth.js GET/POST and the
login Server Action are authentication endpoints, not privileged business actions.
The inline logout action deliberately remains available for clearing a stale session.
Public lead/newsletter actions and the public stock-list PDF are unchanged.

Protected pages: `/admin`, `/admin/users`, `/admin/cars`, `/admin/cars/add`,
`/admin/cars/list`, `/admin/cars/manage`, `/admin/cars/manage/[id]`, `/admin/brands`,
`/admin/categories`, `/admin/homepage`, `/admin/sell-car-leads`,
`/admin/requirement-leads`, `/admin/auction-sheet-requests`, `/admin/newsletter`,
`/admin/media`, `/admin/site-settings`.

## Policy

`lib/adminPermissions.ts` is the single policy source. Existing non-account
workflows remain available to SUPER_ADMIN, ADMIN and EDITOR, matching prior
access, now requiring a current active database account. These grants preserve
existing access; they do not establish a new editorial/business policy.

Account management, including the combined edit form's password/email/role/status
fields, is SUPER_ADMIN-only. No separate self-service account-edit action exists.
Employee permissions encode the approved Option A matrix only; no employee
features, private-data queries or publication workflows are implemented.
Future approved-read and draft permissions must still enforce row/publication scope.

## Identity and failure handling

`getCurrentAdmin` uses the authenticated session subject only as a lookup key,
selects non-secret account fields, checks current active status and role, and does
not cache the result. JWT role/email/name claims never authorize an operation.
Missing/invalid/deleted/disabled accounts are denied. Database/auth errors fail
closed with a generic UNAVAILABLE error. Server Actions throw safe authorization
errors before processing; authorized validation/success contracts remain intact.
Pages redirect invalid accounts to login and forbidden accounts to the dashboard.
Upload POST maps authorization failures to 401/403/503 before parsing the body.

`lib/auth.ts` retains the existing JWT/session callbacks, avoiding recursion or
per-callback database reads. Login additionally rejects unsupported database roles.

## Account safety and concurrency

All four account mutation paths call `withAdminAccountMutation` at READ COMMITTED
isolation. They obtain `LOCK TABLE "AdminUser" IN SHARE ROW EXCLUSIVE MODE`,
re-read the actor's current active SUPER_ADMIN permission after acquiring the lock,
perform the mutation, then count remaining active SUPER_ADMIN accounts. A count
below one throws and rolls back the entire transaction. Self-delete/deactivate
protections remain; last-super self-demotion also rolls back.

The lock serializes account mutations across processes without schema changes.
Password hashing occurs before the lock. Lock/transaction errors fail closed.
Out-of-band SQL, the seed script, or another application bypassing this invariant
can still remove the last super admin. Operations already admitted before a
revocation are not universally cancelled; next privileged requests recheck state.

## Tests and limits

No test dependencies were installed. Run:

```
node --experimental-vm-modules --test tests/security/adminAuthorization.test.mjs
npx tsc --noEmit --incremental false
npm run build
```

The dependency-free Node test harness transpiles the actual TS modules using the
already installed TypeScript package and mocks external auth/database/cache/cloud
boundaries. It tests direct invocation of all 34 action exports, actual resolver
and permission logic, actual account-action mutations, transactional rollback in
the mock store, all existing roles, upload handling, and page-guard placement.
It is not a replacement for full browser/PostgreSQL mutation integration tests.

Optional read-only local integration checks (PowerShell):

```
$env:RUN_LOCAL_LOCK_TEST='1'
node --import tsx --experimental-vm-modules --test tests/security/postgresLock.test.mjs
Remove-Item Env:RUN_LOCAL_LOCK_TEST
$env:RUN_LOCAL_HTTP_TEST='1'
node --test tests/security/httpSmoke.test.mjs
Remove-Item Env:RUN_LOCAL_HTTP_TEST
```

Both integration checks refuse non-local database configuration. The lock test
uses two real PostgreSQL connections and rolls back lock-only transactions. It
also executes the actual account-safety helper through Prisma with concurrent
read-only callbacks and checks they serialize; neither probe mutates accounts.
The HTTP test uses the existing local seeded login,
reads protected pages, and checks lower JWT role/invalid subject behavior without
changing records. Real multi-connection account-mutation testing remains distinct
from the mock concurrency test and the real lock-serialization probe.

The existing `next lint` script is unsupported; lint configuration is out of scope.
Rate limiting, MFA, password-change session invalidation, audit logging, and
dependency remediation remain separate tasks. No employee schema/UI/routes,
public-site changes, migrations, dependency updates or deployment are included.
