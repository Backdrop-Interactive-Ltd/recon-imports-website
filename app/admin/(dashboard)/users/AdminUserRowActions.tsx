"use client";

import { useState, useTransition } from "react";
import styles from "../brands/page.module.css";
import { deleteAdminUserAction, setAdminUserActiveAction } from "./actions";
import type { AdminUserActionState } from "./validation";

type AdminUserRowActionsProps = {
  email: string;
  isActive: boolean;
  isCurrentUser: boolean;
  userId: string;
};

export default function AdminUserRowActions({ email, isActive, isCurrentUser, userId }: AdminUserRowActionsProps) {
  const [message, setMessage] = useState<AdminUserActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleActiveChange() {
    startTransition(async () => {
      setMessage(await setAdminUserActiveAction(userId, !isActive));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${email}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteAdminUserAction(userId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <button
          className={styles.secondaryButton}
          disabled={isPending || (isCurrentUser && isActive)}
          onClick={handleActiveChange}
          type="button"
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <button className={styles.dangerButton} disabled={isPending || isCurrentUser} onClick={handleDelete} type="button">
          Delete
        </button>
      </div>
      {isCurrentUser ? <p className={styles.mutedText}>Current admin account cannot be deleted or deactivated.</p> : null}
      {message?.message ? (
        <p className={message.status === "success" ? styles.inlineSuccess : styles.inlineError}>{message.message}</p>
      ) : null}
    </div>
  );
}
