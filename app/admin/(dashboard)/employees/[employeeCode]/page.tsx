import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPagePermission } from "../../../../../lib/adminAuthorization";
import { hasAdminPermission } from "../../../../../lib/adminPermissions";
import { getEmployeeEditorData, getEmployeeReviewData } from "../../../../../lib/employees/adminQueries";
import { EmployeeActionForm, EmployeePhotoField } from "../EmployeeForms";
import styles from "../page.module.css";
import EmployeeIdentityControls from "../EmployeeIdentityControls";

export const metadata = { title: "Team Profile | Recon Imports Admin" };
export const dynamic = "force-dynamic";
const pageNumber = (value: string | string[] | undefined) => {
  const number = typeof value === "string" ? Number(value) : 1;
  return Number.isSafeInteger(number) && number >= 1 && number <= 10000 ? number : 1;
};
const date = (value: Date | null) => value ? `${value.toISOString().replace("T", " ").slice(0, 19)} UTC` : "Not supplied";
const scopeLabels = { DIRECTORY: "Our Team listing", VERIFICATION: "Public ID profile" };
const memberLabels = { ACTIVE: "Current member", INACTIVE: "Not activated", RESIGNED: "Resigned" };
type Profile = NonNullable<Awaited<ReturnType<typeof getEmployeeEditorData>>>["profiles"][number];

function ProfilePreview({ profile }: { profile: Profile }) {
  return <dl className={styles.facts}>
    <dt>Photo</dt><dd>{profile.portraitStorageKey ? <img src={profile.portraitStorageKey} alt="Saved employee photo" width={120} height={120} style={{ objectFit: "contain" }} /> : "Not supplied"}</dd>
    <dt>Display name</dt><dd>{profile.publicName ?? "Not supplied"}</dd>
    <dt>Designation</dt><dd>{profile.designation ?? "Not supplied"}</dd>
    <dt>Experience</dt><dd>{profile.experienceSummary ?? "Not supplied"}</dd>
    <dt>About this member</dt><dd>{profile.biography ?? "Not supplied"}</dd>
    <dt>Official phone</dt><dd>{profile.officialPhone ?? "Not supplied"}</dd>
    <dt>Official email</dt><dd>{profile.officialEmail ?? "Not supplied"}</dd>
  </dl>;
}

export default async function EmployeePage({ params, searchParams }: {
  params: Promise<{ employeeCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPagePermission("employees.records.read");
  const { employeeCode } = await params, query = await searchParams;
  const revisionPage = pageNumber(query.revisions), approvalPage = pageNumber(query.approvals), historyPage = pageNumber(query.history);
  const data = await getEmployeeEditorData(employeeCode, revisionPage);
  if (!data) notFound();
  const { employee, profiles, departments } = data;
  const review = hasAdminPermission(actor.role, "employees.restricted.read") ? await getEmployeeReviewData(employeeCode, approvalPage, historyPage) : null;
  const writable = !employee.archivedAt && !employee.personalDataErasedAt;
  const base = { employeeId: employee.id, expectedVersion: employee.version };
  const profile = profiles.find(item => item.state === "DRAFT") ?? profiles[0];
  const name = profile?.publicName || employee.internalName || "Team profile";
  const href = (key: string, value: number) => `/admin/employees/${encodeURIComponent(employee.employeeCode)}?${new URLSearchParams({ revisions: String(revisionPage), approvals: String(approvalPage), history: String(historyPage), [key]: String(value) })}`;
  return <section className={styles.page}>
    <header className={styles.panel}>
      <Link href="/admin/employees">Team Members</Link><p className={styles.eyebrow}>Website CMS / Team profile</p>
      <h1>{name}</h1><p>Permanent employee ID <strong>{employee.employeeCode}</strong></p>
      <span className={styles.badge}>{memberLabels[employee.employmentStatus]}</span>
      {employee.archivedAt && <span className={styles.badge}>Archived</span>}
      {employee.personalDataErasedAt && <span className={styles.badge}>Details removed</span>}
    </header>
    <nav className={styles.workflow} aria-label="Team CMS workflow">
      <Link href="/admin/employees">Team Members</Link><a href="#profile">Add/Edit Profile</a><a href="#save-draft">Save Draft</a>
      <a href="#review">Review/Publish</a><a href="#identity">Identity/QR</a><a href="#status">Status</a>
    </nav>

    <section id="profile" className={styles.panel} aria-labelledby="profile-heading">
      <p className={styles.eyebrow}>Your profile content</p><h2 id="profile-heading">Edit profile</h2>
      <p>Save your work as a draft. Changes stay separate from any previously published profile until approved.</p>
      {revisionPage > 1 && <p className={styles.notice}>You are viewing an earlier saved profile. <Link href={href("revisions", 1)}>Return to the latest profile</Link>.</p>}
      <div id="save-draft">
        {profile?.state === "DRAFT" && writable ? <EmployeeActionForm {...base} operation="saveDraft" revision={profile.revision} expectedProfileVersion={profile.version} label="Save Draft">
          <EmployeePhotoField currentUrl={profile.portraitStorageKey} />
          <div className={styles.grid}>
            <label>Display name<input name="publicName" maxLength={160} defaultValue={profile.publicName ?? ""} /><small>Needed before you submit for review.</small></label>
            <label>Designation<input name="designation" maxLength={160} defaultValue={profile.designation ?? ""} /><small>For example, the role shown on the website.</small></label>
          </div>
          <label>Experience<textarea name="experienceSummary" rows={3} maxLength={500} defaultValue={profile.experienceSummary ?? ""} /></label>
          <label>About this member<textarea name="biography" rows={4} maxLength={2000} defaultValue={profile.biography ?? ""} /></label>
          <div className={styles.grid}>
            <label>Official phone<input name="officialPhone" type="tel" maxLength={40} defaultValue={profile.officialPhone ?? ""} /></label>
            <label>Official email<input name="officialEmail" type="email" maxLength={254} defaultValue={profile.officialEmail ?? ""} /></label>
          </div>
          <p className={styles.muted}>Contact details are not shown publicly unless you include them in a consented, approved publication.</p>
          <details className={styles.advanced}><summary>Optional display settings</summary>
            <div className={styles.grid}>
              <label>Team group<select name="departmentId" defaultValue={profile.departmentId ? "__unchanged__" : ""}>{profile.departmentId && <option value="__unchanged__">Keep current: {profile.departmentName ?? "Assigned group"}</option>}<option value="">No group</option>{departments.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
              <label>Display order<input name="displayOrder" type="number" min={0} max={100000} defaultValue={profile.displayOrder} required /></label>
            </div>
            <label className={styles.check}><input name="isFeatured" type="checkbox" defaultChecked={profile.isFeatured} />Feature this member in an approved team listing</label>
          </details>
        </EmployeeActionForm> : <>
          {profile ? <><p className={styles.badge}>{profile.state === "SUBMITTED" ? "Saved for review" : "Read-only profile"}</p><ProfilePreview profile={profile} /></> : <p>No saved profile on this page.</p>}
          {writable && !data.hasDraft && <EmployeeActionForm {...base} operation="newDraft" label="Start a new draft"><p>Submitted information is protected. Start a blank draft to prepare new changes without editing the saved review copy.</p></EmployeeActionForm>}
          {writable && data.hasDraft && <Link href={href("revisions", 1)}>Open the latest draft</Link>}
        </>}
      </div>

      <details className={styles.advanced}><summary>Previous saved profiles</summary>
        {profiles.filter(item => item.id !== profile?.id).map(item => <article className={styles.savedProfile} key={item.id}><h3>Saved version {item.revision}</h3><span className={styles.badge}>{item.state}</span><ProfilePreview profile={item} /></article>)}
        {profiles.length <= 1 && <p>No other saved profiles on this page.</p>}
        <nav className={styles.pagination} aria-label="Profile revision pages">{revisionPage > 1 && <Link href={href("revisions", revisionPage - 1)}>Newer profiles</Link>}{revisionPage * 5 < data.profileCount && revisionPage < 10000 && <Link href={href("revisions", revisionPage + 1)}>Older profiles</Link>}</nav>
      </details>
    </section>

    <section id="review" className={styles.panel} aria-labelledby="review-heading">
      <p className={styles.eyebrow}>Control what is shared</p><h2 id="review-heading">Review &amp; Publish</h2>
      <p>Save first, submit the saved profile, then record consent for the intended use. Approval and publication remain separate decisions.</p>
      <p className={styles.muted}>Publication is separate for the Our Team listing and Public ID profile. Only approved information and its permitted fields are shown.</p>
      {profile?.state === "DRAFT" && writable && <EmployeeActionForm {...base} operation="submit" revision={profile.revision} label="Submit saved profile for review"><p>Only the last saved content is submitted. Save any changes above before continuing.</p></EmployeeActionForm>}
      {writable && employee.employmentStatus === "INACTIVE" && <p className={styles.notice}>A SUPER_ADMIN needs to activate this member under <a href="#status">Status</a> before a new publication request. Changing member status requires a fresh approval.</p>}
      {writable && employee.employmentStatus === "RESIGNED" && <p className={styles.notice}>Returning with renewed consent? Request a fresh review below, then have a SUPER_ADMIN choose that approved profile in the rejoin options.</p>}
      {writable && employee.employmentStatus !== "INACTIVE" && profiles.filter(item => item.state === "SUBMITTED").map(saved => <details key={saved.id} className={styles.advanced}>
        <summary>Request review: {saved.publicName || "Saved profile"} (saved revision {saved.revision})</summary>
        <ProfilePreview profile={saved} />
        <EmployeeActionForm {...base} operation="requestApproval" revision={saved.revision} label="Send consent details for approval">
          <label>Where may this information appear?<select name="scope"><option value="DIRECTORY">Our Team listing</option><option value="VERIFICATION">Public ID profile</option></select></label>
          <label>Consent record reference<input name="consentReference" maxLength={200} required autoComplete="off" /><small>Reference privately retained evidence; do not paste private documents or access links.</small></label>
          <label>Consent policy version<input name="consentPolicyVersion" maxLength={40} required /></label>
          <p className={styles.muted}>Consent is recorded with the current server UTC time when you submit. This records your submission; genuine consent evidence is still required. Leave expiry empty if the consent has no expiry. Otherwise enter its future expiry in UTC (Bangladesh time minus 6 hours).</p>
          <label>Expiry (UTC, optional)<input name="consentExpiresAt" type="datetime-local" /></label>
          <label className={styles.check}><input name="publishPhone" type="checkbox" disabled={!saved.officialPhone} />Allow this official phone to be displayed</label>
          <label className={styles.check}><input name="publishPortrait" type="checkbox" disabled={!saved.portraitStorageKey} />Consent permits this saved photo to be displayed for this use</label>
          <label className={styles.check}><input name="publishEmail" type="checkbox" disabled={!saved.officialEmail} />Allow this official email to be displayed</label>
        </EmployeeActionForm>
      </details>)}
      {review ? <>
        <h3>Review requests</h3>
        {review.approvals.map(approval => {
          const snapshot = profiles.find(item => item.revision === approval.profileRevision && item.state === "SUBMITTED");
          const currentConsent = !approval.withdrawnAt && !approval.evidenceErasedAt && (!approval.consentExpiresAt || approval.consentExpiresAt > new Date());
          const currentPeriod = approval.employmentEpoch === review.publicationEpoch;
          return <article className={styles.reviewCard} key={approval.id}>
            <h3>{scopeLabels[approval.scope]}</h3><span className={styles.badge}>{approval.status === "PENDING" ? "Awaiting review" : approval.status === "APPROVED" ? "Approved" : approval.status === "REJECTED" ? "Declined" : "Consent withdrawn"}</span><span className={styles.badge}>{approval.isPublished ? "Publication on" : "Publication off"}</span>
            {snapshot ? <ProfilePreview profile={snapshot} /> : <p className={styles.notice}>Load the corresponding saved profile using Previous saved profiles above before deciding on this request.</p>}
            {!currentPeriod && <p className={styles.notice}>This request predates a status change. Renew approval before publishing; rejoining has its own consent checks.</p>}
            {!currentConsent && <p className={styles.notice}>This consent is expired, withdrawn or unavailable. Obtain current consent before continuing.</p>}
            <details className={styles.advanced}><summary>Review consent details</summary><dl className={styles.facts}><dt>Consent record</dt><dd>{approval.consentReference ?? "Unavailable"}</dd><dt>Policy version</dt><dd>{approval.consentPolicyVersion ?? "Unavailable"}</dd><dt>Recorded at</dt><dd>{date(approval.consentRecordedAt)}</dd><dt>Expires at</dt><dd>{approval.consentExpiresAt ? date(approval.consentExpiresAt) : "No expiry recorded"}</dd><dt>Contacts allowed</dt><dd>Photo: {approval.publishPortrait ? "Included" : "Excluded"}; phone: {approval.publishPhone ? "Included" : "Private"}; email: {approval.publishEmail ? "Included" : "Private"}</dd></dl></details>
            {writable && snapshot && approval.status === "PENDING" && currentPeriod && currentConsent && <div className={styles.grid}><EmployeeActionForm {...base} operation="approve" approvalId={approval.id} label="Approve profile" confirmation="I reviewed this saved profile, its intended use and the consent evidence." /><EmployeeActionForm {...base} operation="reject" approvalId={approval.id} label="Decline request" confirmation="Decline this review request." /></div>}
            {writable && approval.status === "APPROVED" && !approval.isPublished && employee.employmentStatus === "ACTIVE" && currentPeriod && currentConsent && <EmployeeActionForm {...base} operation="publish" approvalId={approval.id} label="Publish approved information" confirmation="Apply publication only to this approved information and its permitted contact fields." />}
            {writable && approval.isPublished && <EmployeeActionForm {...base} operation="unpublish" approvalId={approval.id} label="Turn publication off" confirmation="Stop sharing this information for the selected use." />}
          </article>;
        })}
        {!review.approvals.length && <p>No review requests on this page. Start with a saved, submitted profile and its consent details.</p>}
        <nav className={styles.pagination} aria-label="Approval pages">{approvalPage > 1 && <Link href={href("approvals", approvalPage - 1)}>Newer requests</Link>}{approvalPage * 20 < review.approvalCount && approvalPage < 10000 && <Link href={href("approvals", approvalPage + 1)}>Older requests</Link>}</nav>
        {!employee.personalDataErasedAt && <details className={styles.advanced}><summary>Withdraw previously recorded consent</summary><EmployeeActionForm {...base} operation="withdrawConsent" label="Withdraw consent" confirmation="Withdraw this consent for every use. It cannot be restored by rejoining."><label>Exact consent record reference<input name="consentReference" required maxLength={200} autoComplete="off" /></label></EmployeeActionForm></details>}
      </> : <p className={styles.notice}>A SUPER_ADMIN reviews consent, approves the submitted information and controls publication.</p>}
    </section>

    <section id="identity" className={styles.panel} aria-labelledby="identity-heading"><p className={styles.eyebrow}>One permanent identity</p><h2 id="identity-heading">Identity &amp; QR</h2>
      <dl className={styles.facts}><dt>Employee ID</dt><dd>{employee.employeeCode}</dd><dt>Permanent profile URL</dt><dd><code>{employee.profileUrl}</code></dd></dl>
      <EmployeeIdentityControls employeeCode={employee.employeeCode} profileUrl={employee.profileUrl} canExport={hasAdminPermission(actor.role, "employees.qr.export") && !employee.personalDataErasedAt} />
    </section>

    <section id="status" className={styles.panel} aria-labelledby="status-heading"><p className={styles.eyebrow}>Current or resigned</p><h2 id="status-heading">Member status</h2>
      <p><strong>{memberLabels[employee.employmentStatus]}</strong>. Changing status preserves the permanent ID and saved profile.</p>
      {hasAdminPermission(actor.role, "employees.verification.status.manage") && !employee.personalDataErasedAt ? <details className={styles.advanced}><summary>Change member status</summary>
        {writable && employee.employmentStatus === "INACTIVE" && <EmployeeActionForm {...base} operation="activate" label="Activate member profile" confirmation="Activate this member. Publication still requires consent and approval." />}
        {writable && employee.employmentStatus !== "RESIGNED" && <EmployeeActionForm {...base} operation="resign" label="Mark as resigned" confirmation="Confirm resignation and suspend existing publication settings." />}
        {(employee.employmentStatus !== "ACTIVE" || employee.archivedAt) && <EmployeeActionForm {...base} operation="rejoin" label="Rejoin team" confirmation="Restore this same member using only approved information with valid consent.">
          <p>By default, previously approved publication settings are restored if their consent remains valid.</p>
          <details className={styles.advanced}><summary>Choose different approved information</summary><p>Selecting manually restores only the selected uses. Expired or withdrawn consent will be refused.</p>
            {(["DIRECTORY", "VERIFICATION"] as const).map(scope => <label key={scope}>{scopeLabels[scope]}<select name="approvalIds" defaultValue=""><option value="">Keep previous selection</option>{review?.approvals.filter(item => item.scope === scope && item.status === "APPROVED" && !item.withdrawnAt && !item.evidenceErasedAt).map(item => <option key={item.id} value={item.id}>Saved version {item.profileRevision} — {item.consentPolicyVersion ?? "Policy unavailable"}</option>)}</select></label>)}
          </details>
        </EmployeeActionForm>}
      </details> : <p className={styles.muted}>Only a SUPER_ADMIN can change member status.</p>}
    </section>

    {review && <details id="technical-history" className={`${styles.panel} ${styles.advanced}`}><summary>Advanced history</summary>
      <p>Technical records are retained for review and security. They are not part of the public profile.</p><p>Record version: {employee.version}</p>
      <h3>Saved profile versions</h3><ul>{profiles.map(item => <li key={item.id}>Version {item.revision}: {item.state}</li>)}</ul>
      <h3>Approval records</h3><ul>{review.approvals.map(item => <li key={item.id}>Profile version {item.profileRevision}; use: {item.scope}; period: {item.employmentEpoch}; decision: {item.status}{item.selfApproved ? "; self-approval recorded" : ""}</li>)}</ul>
      <h3>Protected history</h3><ol className={styles.history}>{review.history.map(event => <li key={event.id}><strong>{event.eventType}</strong> — {date(event.createdAt)}<br />Actor role: {event.actorRole}; record version: {event.recordVersion}{event.profileRevision !== null ? `; revision: ${event.profileRevision}` : ""}{event.isSelfApproval ? "; self-approval recorded" : ""}<br />Fields: {event.changedFields.join(", ") || "None"}</li>)}</ol>
      {!review.history.length && <p>No history events on this page.</p>}
      <nav className={styles.pagination} aria-label="History pages">{historyPage > 1 && <Link href={href("history", historyPage - 1)}>Newer events</Link>}{historyPage * 20 < review.historyCount && historyPage < 10000 && <Link href={href("history", historyPage + 1)}>Older events</Link>}</nav>
    </details>}
  </section>;
}
