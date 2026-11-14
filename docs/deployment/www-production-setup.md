# WWW-PRODUCTION - verified domain cutover

2026-11-14, Asia/Dhaka. Completed under explicit owner approval for the exact www domain, AUTH_URL, canonical code changes, rebuild and deployment. Public URL: https://www.reconimports.com

## Applied changes

- wrangler.jsonc declares www.reconimports.com as the existing Worker's Custom Domain.
- lib/seo.ts and lib/carPublicRoutes.ts use the www origin for metadata and public vehicle links.
- app/sitemap.ts emits www URLs while accepting existing apex and www absolute route inputs. No stored route/database values changed.
- app/robots.ts points to the www sitemap. app/stock-list.pdf/route.ts uses the www site/link origin.
- Only AUTH_URL was supplied in the deployment secret file, set to https://www.reconimports.com. Existing AUTH_SECRET and Cloudinary secret values were inherited, not regenerated or resubmitted.
- The nonsecret production secret manifest now reflects the existing Worker and www origin.

## Conflict-safe domain attachment

Cloudflare's domain changeset returned zero conflicting DNS records and zero removed domains. The domain was attached with override_existing_dns_record=false and override_existing_origin=false. The endpoint was then deployed with the rebuilt artifact and existing bindings.

The installed Wrangler noninteractive domain publisher sets overwrite flags true. To honor the owner's no-forced-replacement rule, the operator used the conflict-checked Cloudflare domain API, then a generated upload configuration that omitted route publication. This generated configuration was removed afterward; tracked Wrangler configuration retains the www Custom Domain for review.

No apex or mail DNS operations were requested or performed. Full zone DNS-record listing was previously unavailable to this OAuth token (403); preservation is supported by the targeted www changeset/operations, not a full before/after DNS inventory. No apex redirect was configured.

## Verification

- TypeScript passed. OpenNext/Next production build and local-only Wrangler dry run passed: 17,256.69 KiB raw / 4,504.88 KiB gzip. Existing build warnings/fallback prerender behavior remain; the upload does not seed R2 with those build-time fallback pages.
- Canonical, sitemap legacy-input, domain-conflict safety and authentication redirect tests passed.
- www Home and About Us return HTTP 200 over trusted HTTPS. Canonical and Open Graph URLs use www.
- robots.txt and sitemap.xml return HTTP 200 and www URLs; no apex sitemap entries were found.
- Actual Credentials signin/callback URLs use https://www.reconimports.com. Login page returns 200. Anonymous /admin returns 307 to /admin/login with no-store headers. A real administrator login/browser-cookie flow was not performed in this task.
- Cloudflare reports the www Custom Domain attached to recon-imports-website. Complete binding descriptors before/after deployment match, including existing Hyperdrive/R2 and secret names. No Hyperdrive or R2 reconfiguration was performed.
- The initial verification stopped because the operator expected a homepage canonical trailing slash; Next emits the equivalent root URL without it. The check was corrected and covered by a regression test. Follow-up read-only verification passed without redeployment; the initial failure receipt is retained.

Private evidence: `.local/launch06/20261114153546151-www-production-96da09fa/`. Generated AUTH_URL upload JSON and generated route-free upload configuration are absent after cleanup. No credential values are in source or logs.

No database migrations/imports/record writes, media operations, GitHub push, apex/mail changes or unrelated domain operations were performed. Original owner environment, media and backup evidence remain preserved. Local task commit is recorded in the completion response.

Operator tooling: scripts/www-production-deploy.mjs; tests/security/wwwCanonical.test.mjs and wwwDomainSafety.test.mjs. Application changes are restricted to the five URL files and Wrangler domain declaration listed above.
