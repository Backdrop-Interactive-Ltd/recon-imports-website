"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createEmployeeAction, employeeAction } from "./actions";
import { initialEmployeeActionState } from "./formState";
import styles from "./page.module.css";

export function CreateEmployeeForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createEmployeeAction, initialEmployeeActionState);
  return <form action={action} className={styles.form}>
    <fieldset disabled={pending || state.status === "success"}>
      <label>Name<input name="internalName" maxLength={160} autoComplete="off" required aria-describedby="new-team-name-help" /></label>
      <p id="new-team-name-help" className={styles.muted}>A private working name for finding this profile in the CMS. You can set the public display name on the next screen.</p>
      <details className={styles.advanced}><summary>Optional grouping</summary><label>Team group<select name="departmentId"><option value="">No group</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></details>
      <button type="submit">{pending ? "Creating draft…" : "Create draft and continue"}</button>
    </fieldset>
    {state.message && <p className={styles.feedback} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.status === "success" ? `Draft created with permanent ID ${state.employeeCode}. Nothing has been published.` : state.message}</p>}
    {state.employeeCode && <Link className={styles.button} href={`/admin/employees/${encodeURIComponent(state.employeeCode)}`}>Continue editing profile</Link>}
  </form>;
}

type ActionFormProps = {
  operation: string; employeeId: string; expectedVersion: number; label: string;
  revision?: number; expectedProfileVersion?: number; approvalId?: string;
  confirmation?: string; children?: ReactNode;
};
const successMessages: Record<string, string> = {
  newDraft: "A new draft is ready to edit. Published information has not changed.",
  saveDraft: "Draft saved. These changes have not been published.",
  submit: "Saved profile submitted. Add its consent details to request approval.",
  requestApproval: "Consent recorded and review requested. Publication still needs approval.",
  approve: "Approved. Choose Publish when you are ready to apply this publication setting.",
  reject: "Request declined. The profile has not been published by this action.",
  publish: "Approved information published for its selected use and permitted fields.",
  unpublish: "This publication setting has been turned off.",
  activate: "Profile activated. Approval and publication are still separate steps.",
  resign: "Member marked as resigned. Existing publications have been suspended.",
  rejoin: "Member rejoined with the same ID. Eligible approved publication settings were restored.",
  withdrawConsent: "Consent withdrawn. Information using this consent cannot be republished.",
};
export function EmployeeActionForm({ operation, employeeId, expectedVersion, label, revision, expectedProfileVersion, approvalId, confirmation, children }: ActionFormProps) {
  const [state, action, pending] = useActionState(employeeAction, initialEmployeeActionState);
  return <form action={action} className={styles.form} aria-busy={pending}>
    {/* Reset visible defaults together with concurrency tokens after a refresh. */}
    <fieldset key={`${expectedVersion}-${expectedProfileVersion ?? ""}`} disabled={pending}>
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      {revision !== undefined && <input type="hidden" name="revision" value={revision} />}
      {expectedProfileVersion !== undefined && <input type="hidden" name="expectedProfileVersion" value={expectedProfileVersion} />}
      {approvalId && <input type="hidden" name="approvalId" value={approvalId} />}
      {children}
      {confirmation && <label className={styles.check}><input type="checkbox" name="confirmed" required />{confirmation}</label>}
      <button type="submit">{pending ? "Please wait…" : label}</button>
    </fieldset>
    {state.message && <p className={styles.feedback} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.status === "success" ? successMessages[operation] ?? state.message : state.message}</p>}
    {state.code === "CONFLICT" && <button type="button" onClick={() => window.location.reload()}>Reload latest profile</button>}
  </form>;
}

export function EmployeePhotoField({ currentUrl }: { currentUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <div>
    <label>Employee photo (JPG, PNG or WebP, maximum 3 MB)
      <input name="employeePhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.target.files?.[0]; setError(""); setPreview(null);
        if (!file) return;
        if (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setError("Choose a JPG, PNG or WebP photo no larger than 3 MB."); event.target.value = ""; return;
        }
        setPreview(URL.createObjectURL(file));
      }} />
    </label>
    {(preview || currentUrl) && <img src={preview || currentUrl!} alt="Employee photo preview" style={{ width: 160, height: 160, objectFit: "contain", maxWidth: "100%" }} />}
    <p>Choose a replacement, then Save Draft. Previous uploaded photos are retained.</p>
    <p>Cloudinary URLs are public immediately after upload, even before publication. Withdrawing publication does not revoke copied URLs.</p>
    <label><input type="checkbox" name="photoUploadConsent" required={!!preview} />I have permission to upload this photo to public Cloudinary storage. Website display needs separate publication consent.</label>
    {error && <p role="alert">{error}</p>}
  </div>;
}
