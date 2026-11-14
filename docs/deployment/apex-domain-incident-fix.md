# Apex domain incident fix — 2026-11-14

## Authorized change and result

The owner authorized adding the apex Custom Domain to the existing Worker and deploying a permanent redirect to the primary `https://www.reconimports.com` origin. The owner confirmed Workers Free and requested unchanged billing. No CPU limit, billing, authentication secret or database changes were made.

`reconimports.com` previously had no public A/AAAA/CNAME web records. Its existing email routing MX and TXT records were preserved. The existing www Custom Domain was preserved. The conflict-safe Custom Domain API request disallowed existing origin and DNS-record replacement. The subsequent asset/Worker deployment omitted routes to avoid Wrangler's automatic DNS override behavior; domains were attached separately with explicit safeguards.

Cloudflare and Google public DNS subsequently resolved the apex to Cloudflare. Local system DNS retained a negative response during verification. The deployment was not repeated. A read-only follow-up used a current public DNS address with the original HTTPS hostname/SNI and normal certificate validation. It verified all three cases:

- `/` → `https://www.reconimports.com/` (308).
- `/about-us?source=apex&test=one%20two` → the same path/query on www (308).
- `/admin/login?callbackUrl=%2Fadmin` → the same path/query on www (308).

The deployment receipt stopped at HTTPS verification because of the local resolver response; the separate follow-up receipt records the successful live redirect checks. Both receipts are retained privately under `.local`. No automatic redeployment was performed.

www homepage, About Us, login page and authentication provider endpoint returned HTTP 200. The homepage title identifies Recon Imports and its canonical origin is www. Authentication provider callback URLs use www; AUTH_URL was already correct and was not changed. Homepage logo and hero image delivery were checked separately.

## Remaining authentication blocker

A private login attempt failed with HTTP 503. Live Worker diagnostics identified `exceededCpu` at 10 ms on `/api/auth/callback/credentials`. Workers Free permits 10 ms CPU per invocation; see the [official CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time). Login-page availability is not evidence that credential authentication works. Admin login remains blocked. No bcrypt weakening, password reset or authentication rewrite was attempted. The proposed larger CPU budget was conditional on Workers Paid; the owner chose to retain Free, so it was not applied.

## Legacy origin inspection limitations

No LimdaHost references were found in the inspected application configuration or public apex/www web DNS. Full DNS-record and zone-redirect API inspection was denied (HTTP 403), so absence of every possible stale record/rule is unverified. No unrelated or unverified DNS records were deleted.

## Verification and preservation

- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Focused redirect/domain safety tests: `node --test tests/security/apexRedirect.test.mjs` passed.
- `npm run build:workers` passed, including Next production compilation, OpenNext build, artifact scanning and Wrangler dry run.
- Before/after Worker binding and secret descriptors match. Existing usage model and CPU limits match. Public apex MX/TXT snapshots match.
- No database, media, environment-file, other secret, billing or GitHub changes were authorized or performed. Existing protected backup/media evidence remains intact.

The domain-only fix is complete. The overall incident remains partially resolved because production credential login exceeds the retained Free-plan CPU limit. Further authentication/runtime changes require a separately scoped decision; do not redeploy or change billing automatically.
