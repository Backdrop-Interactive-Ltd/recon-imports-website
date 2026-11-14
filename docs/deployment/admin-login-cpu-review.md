# Admin login CPU feasibility — 2026-11-14

## Finding

The existing bcrypt verification is an independently sufficient blocker to reliably fitting this login flow into Workers Free's 10 ms CPU budget. No safe small authentication or middleware change was identified that meets that budget while preserving the existing account hash and authentication guarantees. Application code and runtime configuration were left unchanged.

The previously captured production callback event reported `exceededCpu` at 10 ms on `/api/auth/callback/credentials`. It identifies the failing request, not the exact JavaScript instruction where execution was terminated. The measurements below isolate the unavoidable password-verification work; they do not claim a Cloudflare edge profile.

## Inspected path

- `app/admin/(auth)/login/page.tsx`: presentation and client login form; no password hashing in the page render.
- `app/api/auth/[...nextauth]/route.ts`: delegates directly to the existing NextAuth GET/POST handlers.
- `lib/auth.ts`: validates input, performs one account lookup, checks active state/role, then calls `bcrypt.compare`. JWT sessions and exact-origin redirect validation are already in place. No custom root middleware/proxy file exists.
- `lib/adminAuthorization.ts`: protected operations recheck the live account; these safeguards must not be cached away to reduce CPU.
- `prisma/seed.ts` and account creation/update actions use bcrypt cost 12. A read-only query against the verified local owner database confirmed the active SUPER_ADMIN's hash cost is 12, without displaying the hash or password. The prior approved production import preserved that hash.

## Executed checks

A warmed-up synthetic password/hash benchmark used the installed `bcryptjs` at cost 12. Three comparisons consumed **250, 219 and 235 ms of Node process CPU** (236.34, 233.57 and 233.44 ms elapsed). The actual `authorize` callback, loaded through the existing module test harness with a synthetic account and mocked database, consumed **313 ms CPU**, 239.32 ms elapsed. Process CPU includes scheduling/GC overhead; these local measurements are not edge CPU guarantees. Even the isolated bcrypt operation substantially exceeds 10 ms before framework/database protocol overhead.

No owner credentials were used in the benchmark. No production login or database query was repeated for this investigation. The local account inspection used a validated localhost target and `default_transaction_read_only=on`; no records were changed.

The first benchmark attempt reached the harness without Node's VM-module flag and stopped with `vm.SourceTextModule is not a constructor`. It was rerun successfully with `--experimental-vm-modules`.

`node --experimental-vm-modules --test tests/security/adminRedirect.test.mjs tests/security/adminAuthorization.test.mjs`: **11 passed, 0 failed**. Coverage includes valid/invalid passwords, inactive/invalid-role rejection, exact-origin redirects, live authorization and stale-session permission rejection. Tests use synthetic accounts and mocked mutations, not owner records.

TypeScript was checked separately. A new production build was unnecessary for this documentation-only change; the preceding apex task's Workers production build passed on the unchanged application code. No new runtime/build success is inferred from the benchmark.

## Smallest safe resolution

Keep the existing hash, password verification and authorization logic. Workers Paid is the minimum Cloudflare plan change recommended for this application: a $5 USD/month account subscription minimum, with usage charges possible. Its default HTTP CPU budget is 30,000 ms. Start with that default and verify a real login after separately authorized configuration/deployment work; the benchmark alone does not guarantee the entire production flow.

Official references: [CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

Yielding bcrypt work across asynchronous chunks does not remove its total CPU cost. Reducing the work factor, accepting cached password results or bypassing account checks would weaken security and was not attempted. Moving verification to another service would be a larger architecture/security change rather than the requested small fix.

## Preservation and status

Only this report changed. No billing, secrets, DNS, application source, database records, uploads, GitHub pushes or deployments changed. Admin login remains blocked on the retained Free plan. No redeployment is proposed without explicit owner authorization.
