"use client";

import { useState, useTransition } from "react";
import { deleteCategoryAction, setCategoryActiveAction } from "./actions";
import styles from "../brands/page.module.css";
import type { CategoryActionState } from "./validation";

type CategoryRowActionsProps = {
  categoryId: string;
  categoryName: string;
  isActive: boolean;
};

export default function CategoryRowActions({ categoryId, categoryName, isActive }: CategoryRowActionsProps) {
  const [message, setMessage] = useState<CategoryActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange() {
    startTransition(async () => {
      setMessage(await setCategoryActiveAction(categoryId, !isActive));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${categoryName}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteCategoryAction(categoryId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <button className={styles.secondaryButton} disabled={isPending} onClick={handleStatusChange} type="button">
          {isActive ? "Deactivate" : "Activate"}
        </button>
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
