"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "../../../../lib/generated/prisma/enums";
import styles from "../brands/page.module.css";
import { deleteRequirementLeadAction, updateRequirementLeadStatusAction } from "./actions";
import { formatLeadStatus, requirementLeadStatusOptions, type RequirementLeadActionState } from "./formOptions";

type RequirementLeadRowActionsProps = {
  leadId: string;
  leadName: string;
  status: LeadStatus;
};

export default function RequirementLeadRowActions({ leadId, leadName, status }: RequirementLeadRowActionsProps) {
  const [message, setMessage] = useState<RequirementLeadActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(nextStatus: string) {
    startTransition(async () => {
      setMessage(await updateRequirementLeadStatusAction(leadId, nextStatus));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${leadName}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteRequirementLeadAction(leadId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <select
          className={styles.statusSelect}
          disabled={isPending}
          onChange={(event) => handleStatusChange(event.target.value)}
          value={status}
        >
          {requirementLeadStatusOptions.map((option) => (
            <option key={option} value={option}>
              {formatLeadStatus(option)}
            </option>
          ))}
        </select>
        <button className={styles.dangerButton} disabled={isPending} onClick={handleDelete} type="button">
          Delete
        </button>
      </div>
      {message?.message ? (
        <p className={message.status === "success" ? styles.inlineSuccess : styles.inlineError}>{message.message}</p>
      ) : null}
    </div>
  );
}
