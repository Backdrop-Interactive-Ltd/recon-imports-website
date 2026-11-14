import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPagePermission } from "../../../../../lib/adminAuthorization";
import { hasAdminPermission } from "../../../../../lib/adminPermissions";
import { getEmployeeEditorData, getEmployeeReviewData } from "../../../../../lib/employees/adminQueries";
import { EmployeeActionForm } from "../EmployeeForms";
import styles from "../page.module.css";

export const metadata = { title: "Employee | Recon Imports Admin" };
export const dynamic = "force-dynamic";
const pageNumber = (value: string | string[] | undefined) => {
  const number = typeof value === "string" ? Number(value) : 1;
  return Number.isSafeInteger(number) && number >= 1 && number <= 10000 ? number : 1;
};
const date = (value: Date | null) => value ? `${value.toISOString().replace("T", " ").slice(0, 19)} UTC` : "Not supplied";

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
  const href = (key: string, value: number) => `/admin/employees/${encodeURIComponent(employee.employeeCode)}?${new URLSearchParams({ revisions: String(revisionPage), approvals: String(approvalPage), history: String(historyPage), [key]: String(value) })}`;
  return <section className={styles.page}>
    <header className={styles.panel}><Link href="/admin/employees">Back to employees</Link><p className={styles.eyebrow}>Employee / private workspace</p><h1>{employee.employeeCode}</h1>
      <span className={styles.badge}>{employee.employmentStatus}</span>{employee.archivedAt && <span className={styles.badge}>Archived</span>}{employee.personalDataErasedAt && <span className={styles.badge}>Personal data erased</span>}
      <dl className={styles.facts}><dt>Internal name</dt><dd>{employee.internalName ?? "Not supplied"} (read-only)</dd><dt>Canonical profile path</dt><dd><code>{employee.profilePath}</code> — public pages are outside this release.</dd><dt>Record version</dt><dd>{employee.version}</dd></dl>
      <p>Saving a draft does not publish it. Submitted revisions are frozen; create a new draft to make further changes.</p>
    </header>

    <section className={styles.panel} aria-labelledby="profiles-heading"><h2 id="profiles-heading">Profile revisions</h2>
      {writable && !data.hasDraft && <EmployeeActionForm {...base} operation="newDraft" label="Create a new blank draft" />}
      {profiles.map(profile => <article className={styles.panel} key={profile.id}>
        <h3>Revision {profile.revision} <span className={styles.badge}>{profile.state}</span></h3>
        {profile.state === "DRAFT" && writable ? <>
          <EmployeeActionForm {...base} operation="saveDraft" revision={profile.revision} expectedProfileVersion={profile.version} label="Save draft">
            <div className={styles.grid}>
              <label>Public name<input name="publicName" maxLength={160} defaultValue={profile.publicName ?? ""} /></label>
              <label>Designation<input name="designation" maxLength={160} defaultValue={profile.designation ?? ""} /></label>
              <label>Department<select name="departmentId" defaultValue={profile.departmentId ? "__unchanged__" : ""}>{profile.departmentId && <option value="__unchanged__">Keep current: {profile.departmentName ?? "Assigned department"}</option>}<option value="">No department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
              <label>Display order<input name="displayOrder" type="number" min={0} max={100000} defaultValue={profile.displayOrder} required /></label>
              <label>Official phone<input name="officialPhone" type="tel" maxLength={40} defaultValue={profile.officialPhone ?? ""} /></label>
              <label>Official email<input name="officialEmail" type="email" maxLength={254} defaultValue={profile.officialEmail ?? ""} /></label>
            </div>
            <label>Biography<textarea name="biography" rows={5} maxLength={2000} defaultValue={profile.biography ?? ""} /></label>
            <label>Experience summary<textarea name="experienceSummary" rows={3} maxLength={500} defaultValue={profile.experienceSummary ?? ""} /></label>
            <label className={styles.check}><input name="isFeatured" type="checkbox" defaultChecked={profile.isFeatured} />Featured in an approved directory publication</label>
            <p>Portrait uploads are intentionally unavailable. Phone and email remain private unless separately approved for the selected publication scope.</p>
          </EmployeeActionForm>
          <EmployeeActionForm {...base} operation="submit" revision={profile.revision} label="Submit saved revision for review"><p>Save changes first. Submission freezes the saved name, designation and profile content; it does not publish them.</p></EmployeeActionForm>
        </> : <dl className={styles.facts}><dt>Public name</dt><dd>{profile.publicName ?? "Not supplied"}</dd><dt>Designation</dt><dd>{profile.designation ?? "Not supplied"}</dd><dt>Department</dt><dd>{profile.departmentName ?? "None"}</dd><dt>Biography</dt><dd>{profile.biography ?? "Not supplied"}</dd><dt>Experience</dt><dd>{profile.experienceSummary ?? "Not supplied"}</dd><dt>Official phone</dt><dd>{profile.officialPhone ?? "Not supplied"}</dd><dt>Official email</dt><dd>{profile.officialEmail ?? "Not supplied"}</dd></dl>}
        {profile.state === "SUBMITTED" && writable && employee.employmentStatus === "INACTIVE" && <p className={styles.notice}>A SUPER_ADMIN must activate this inactive employee before a new publication approval is requested. Activation changes the publication epoch; older requests cannot be carried forward automatically.</p>}
        {profile.state === "SUBMITTED" && writable && employee.employmentStatus === "RESIGNED" && <p className={styles.notice}>To renew withdrawn or expired consent before rejoining, request a fresh approval below and have a SUPER_ADMIN approve it. Select that approval explicitly in the rejoin form; the saved resume plan still refers to the previous approvals.</p>}
        {profile.state === "SUBMITTED" && writable && employee.employmentStatus !== "INACTIVE" && <details><summary>Request publication approval for revision {profile.revision}</summary>
          <EmployeeActionForm {...base} operation="requestApproval" revision={profile.revision} label="Record consent and request approval">
            <label>Publication scope<select name="scope"><option value="DIRECTORY">Team directory</option><option value="VERIFICATION">Identity verification</option></select></label>
            <label>Consent evidence reference<input name="consentReference" maxLength={200} required autoComplete="off" /></label>
            <label>Consent policy version<input name="consentPolicyVersion" maxLength={40} required /></label>
            <div className={styles.grid}><label>Consent recorded at (UTC)<input name="consentRecordedAt" type="datetime-local" required /></label><label>Consent expires at (UTC, optional)<input name="consentExpiresAt" type="datetime-local" /></label></div>
            <label className={styles.check}><input name="publishPhone" type="checkbox" disabled={!profile.officialPhone} />Include official phone in this scope</label>
            <label className={styles.check}><input name="publishEmail" type="checkbox" disabled={!profile.officialEmail} />Include official email in this scope</label>
            <p>Use a reference to privately retained evidence, not the evidence itself. Do not enter passwords, identity documents or private URLs. This request still requires SUPER_ADMIN review.</p>
          </EmployeeActionForm>
        </details>}
      </article>)}
      {!profiles.length && <p>No revisions on this page.</p>}
      <nav className={styles.pagination} aria-label="Profile revision pages">{revisionPage > 1 && <Link href={href("revisions", revisionPage - 1)}>Previous revisions</Link>}<span>Page {revisionPage}</span>{revisionPage * 5 < data.profileCount && revisionPage < 10000 && <Link href={href("revisions", revisionPage + 1)}>More revisions</Link>}</nav>
    </section>

    {review && <section className={styles.panel} aria-labelledby="approval-heading"><h2 id="approval-heading">Consent review and publication</h2><p>Review the exact submitted revision before deciding. Approval does not publish. The services recheck consent, employment and revision eligibility on every action.</p>
      {review.approvals.map(approval => <article className={styles.panel} key={approval.id}>
        <h3>Revision {approval.profileRevision} / {approval.scope}</h3><span className={styles.badge}>{approval.status}</span><span className={styles.badge}>{approval.isPublished ? "Published" : "Unpublished"}</span>{approval.selfApproved && <span className={styles.badge}>Audited self-approval</span>}
        {approval.employmentEpoch !== review.publicationEpoch && <p className={styles.notice}>This approval belongs to a previous employment period. It cannot be directly approved or published now; rejoining performs its own consent checks.</p>}
        {(approval.withdrawnAt || approval.evidenceErasedAt || (approval.consentExpiresAt && approval.consentExpiresAt <= new Date())) && <p className={styles.notice}>This consent is withdrawn, erased or expired. It cannot authorize a new publication.</p>}
        <dl className={styles.facts}><dt>Consent reference</dt><dd>{approval.consentReference ?? "Erased or unavailable"}</dd><dt>Policy version</dt><dd>{approval.consentPolicyVersion ?? "Unavailable"}</dd><dt>Recorded at</dt><dd>{date(approval.consentRecordedAt)}</dd><dt>Expires at</dt><dd>{approval.consentExpiresAt ? date(approval.consentExpiresAt) : "No expiry recorded"}</dd><dt>Contact approval</dt><dd>Phone: {approval.publishPhone ? "Included" : "Private"}; email: {approval.publishEmail ? "Included" : "Private"}</dd></dl>
        {approval.profileRevision < (profiles.at(-1)?.revision ?? Infinity) && <p>Use the revision pages above to inspect this older submitted profile before approval.</p>}
        {writable && approval.status === "PENDING" && approval.employmentEpoch === review.publicationEpoch && !approval.withdrawnAt && !approval.evidenceErasedAt && (!approval.consentExpiresAt || approval.consentExpiresAt > new Date()) && <div className={styles.grid}><EmployeeActionForm {...base} operation="approve" approvalId={approval.id} label="Approve revision" confirmation="I reviewed the submitted content, scope and consent evidence." /><EmployeeActionForm {...base} operation="reject" approvalId={approval.id} label="Reject request" confirmation="Reject this approval request." /></div>}
        {writable && approval.status === "APPROVED" && !approval.isPublished && employee.employmentStatus === "ACTIVE" && approval.employmentEpoch === review.publicationEpoch && !approval.withdrawnAt && !approval.evidenceErasedAt && (!approval.consentExpiresAt || approval.consentExpiresAt > new Date()) && <EmployeeActionForm {...base} operation="publish" approvalId={approval.id} label="Publish this scope" confirmation="Publish only this approved revision and its selected contact fields." />}
        {writable && approval.isPublished && <EmployeeActionForm {...base} operation="unpublish" approvalId={approval.id} label="Unpublish this scope" confirmation="Remove this scope from public availability." />}
      </article>)}
      {!review.approvals.length && <p>No publication requests on this page.</p>}
      <nav className={styles.pagination} aria-label="Approval pages">{approvalPage > 1 && <Link href={href("approvals", approvalPage - 1)}>Previous approvals</Link>}<span>Page {approvalPage}</span>{approvalPage * 20 < review.approvalCount && approvalPage < 10000 && <Link href={href("approvals", approvalPage + 1)}>More approvals</Link>}</nav>
      {!employee.personalDataErasedAt && <details><summary>Withdraw consent across all scopes</summary><EmployeeActionForm {...base} operation="withdrawConsent" label="Withdraw consent" confirmation="Withdraw this consent reference across all scopes. Previously approved content using it cannot be revived."><label>Exact consent reference<input name="consentReference" required maxLength={200} autoComplete="off" /></label></EmployeeActionForm></details>}
    </section>}

    {hasAdminPermission(actor.role, "employees.verification.status.manage") && !employee.personalDataErasedAt && <section className={styles.panel} aria-labelledby="lifecycle-heading"><h2 id="lifecycle-heading">Employment lifecycle</h2>
      <p className={styles.notice}>These actions preserve the permanent employee identity. They do not create an Admin account or reset credentials.</p>
      {writable && employee.employmentStatus === "INACTIVE" && <EmployeeActionForm {...base} operation="activate" label="Activate without publishing" confirmation="Activate this employee. Publication will still require a current approval and a separate publish action." />}
      {writable && employee.employmentStatus !== "RESIGNED" && <EmployeeActionForm {...base} operation="resign" label="Mark as resigned" confirmation="Confirm resignation. All currently published scopes will be suspended immediately." />}
      {(employee.employmentStatus !== "ACTIVE" || employee.archivedAt) && <EmployeeActionForm {...base} operation="rejoin" label="Rejoin and restore eligible publications" confirmation="Restore this same employee using approved submitted revisions and current consent only.">
        <p>Leave both selections unchanged to use the previously published approvals retained by the service. If selecting manually, only the selected scopes will be restored. Missing, expired or withdrawn consent blocks rejoining.</p>
        {(["DIRECTORY", "VERIFICATION"] as const).map(scope => <label key={scope}>{scope} approval<select name="approvalIds" defaultValue=""><option value="">Use saved resume plan (unless another scope is selected)</option>{review?.approvals.filter(a => a.scope === scope && a.status === "APPROVED" && !a.withdrawnAt && !a.evidenceErasedAt).map(a => <option key={a.id} value={a.id}>Revision {a.profileRevision} — {a.consentPolicyVersion ?? "Unknown policy"}</option>)}</select></label>)}
      </EmployeeActionForm>}
    </section>}

    {review && <section className={styles.panel} aria-labelledby="history-heading"><h2 id="history-heading">Protected history</h2><p>Read-only audit metadata. No identity keys, evidence payloads or administrator identifiers are exposed.</p><ol className={styles.history}>{review.history.map(event => <li key={event.id}><strong>{event.eventType}</strong> — {date(event.createdAt)}<br />Actor role: {event.actorRole}; record version: {event.recordVersion}{event.profileRevision !== null ? `; revision: ${event.profileRevision}` : ""}{event.isSelfApproval ? "; self-approval recorded" : ""}<br />Fields: {event.changedFields.join(", ") || "None"}</li>)}</ol>{!review.history.length && <p>No audit events on this page.</p>}<nav className={styles.pagination} aria-label="History pages">{historyPage > 1 && <Link href={href("history", historyPage - 1)}>Previous events</Link>}<span>Page {historyPage}</span>{historyPage * 20 < review.historyCount && historyPage < 10000 && <Link href={href("history", historyPage + 1)}>More events</Link>}</nav></section>}
    {!review && <p className={styles.notice}>Approval decisions, publication, lifecycle controls, consent evidence review and audit history require SUPER_ADMIN access.</p>}
  </section>;
}
