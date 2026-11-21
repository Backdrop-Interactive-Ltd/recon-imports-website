# Employee photo upload � local implementation

> Status clarification ? RCI-GIT-02 (2026-11-21): Historical implementation report. The local Cloudinary configuration was subsequently supplied privately, public team/profile routes were added, and Workers compatibility was verified in employee-photo-workers-compatibility.md. Configuration is environment-specific: keep credentials private and verify their presence/authentication without printing values. The public-URL and orphan-upload limitations below still apply. Future production hosting is planned for Node.js/VPS; no new Cloudflare deployment is authorized.

## Implemented
- Team CMS draft editor accepts JPG/PNG/WebP, with preview and replacement via Save Draft.
- Maximum 3 MB; server checks extension, MIME, decoded raster format, pixel count and animation; re-encodes WebP without source metadata.
- Existing signed public Cloudinary uploader reused under employees/<employeeId>. No local-file fallback.
- Upload requires current employee draft-edit and uploads.create permissions, an eligible version-matched draft, and explicit permission for public Cloudinary storage.
- Draft attachment uses existing employee/profile locks and version checks. Submitted snapshots remain immutable.
- Separate scope-specific publishPortrait consent controls the photo field in existing public eligibility queries. Status, approval, consent and epoch checks remain intact. No /team route added.
- Portrait erasure remains blocked pending a separately reviewed media cleanup policy.
- Server Action body limit is 4 MB to accommodate the validated 3 MB file plus form fields.

## Important limits
Cloudinary URLs are publicly accessible immediately. Unpublishing, resignation and consent withdrawal stop website DTO disclosure but do not revoke copied URLs or delete Cloudinary assets.
Local Cloudinary variables are currently absent. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET securely before live testing; no environment files or credentials were changed by this task.
Uploads and database saving are not one atomic operation. A save conflict/failure after upload can leave an unreferenced image; previous images are retained and no deletion is automatic. Reload before retrying a conflict.
No live upload, browser interaction, database mutation or Workers runtime test was performed.

## Verification
- 19 database-free tests passed: employeePhoto, teamCmsPresentation, adminAuthorization, adminRedirect.
- npx tsc --noEmit --incremental false: passed.
- RECON_ISOLATED_BUILD=eid04 npm run build: passed; original development build output preserved.
- git diff --check: passed (Git emitted line-ending normalization warnings).

No migrations, database switches, port changes, original media changes, commits, pushes or deployments.
