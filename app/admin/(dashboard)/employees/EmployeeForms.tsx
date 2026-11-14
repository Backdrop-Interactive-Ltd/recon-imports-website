"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { createEmployeeAction, employeeAction } from "./actions";
import { initialEmployeeActionState } from "./formState";
import styles from "./page.module.css";

export function CreateEmployeeForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createEmployeeAction, initialEmployeeActionState);
  return <form action={action} className={styles.form}>
    <fieldset disabled={pending || state.status === "success"}>
      <label>Internal name (private)<input name="internalName" maxLength={160} /></label>
      <label>Department<select name="departmentId"><option value="">No department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <p>The permanent employee code is allocated automatically. The employee starts inactive; nothing is published.</p>
      <button type="submit">{pending ? "Creating…" : "Create employee"}</button>
    </fieldset>
    <p role="status" aria-live="polite">{state.message}</p>
    {state.employeeCode && <Link className={styles.button} href={`/admin/employees/${encodeURIComponent(state.employeeCode)}`}>Open {state.employeeCode}</Link>}
  </form>;
}

type ActionFormProps = {
  operation: string; employeeId: string; expectedVersion: number; label: string;
  revision?: number; expectedProfileVersion?: number; approvalId?: string;
  confirmation?: string; children?: ReactNode;
};
export function EmployeeActionForm({ operation, employeeId, expectedVersion, label, revision, expectedProfileVersion, approvalId, confirmation, children }: ActionFormProps) {
  const [state, action, pending] = useActionState(employeeAction, initialEmployeeActionState);
  return <form action={action} className={styles.form}>
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
      <button type="submit">{pending ? "Working…" : label}</button>
    </fieldset>
    <p role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>
  </form>;
}
