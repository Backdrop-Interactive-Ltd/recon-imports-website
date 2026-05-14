"use client";

import { useState, useTransition } from "react";
import { deleteBrandAction, setBrandActiveAction } from "./actions";
import styles from "./page.module.css";
import type { BrandActionState } from "./validation";

type BrandRowActionsProps = {
  brandId: string;
  brandName: string;
  carCount: number;
  isActive: boolean;
};

export default function BrandRowActions({ brandId, brandName, carCount, isActive }: BrandRowActionsProps) {
  const [message, setMessage] = useState<BrandActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange() {
    startTransition(async () => {
      setMessage(await setBrandActiveAction(brandId, !isActive));
    });
  }

  function handleDelete() {
    const actionLabel = carCount > 0 ? "deactivate" : "delete";

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${brandName}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteBrandAction(brandId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <button className={styles.secondaryButton} disabled={isPending} onClick={handleStatusChange} type="button">
          {isActive ? "Deactivate" : "Activate"}
        </button>
        <button className={styles.dangerButton} disabled={isPending} onClick={handleDelete} type="button">
          {carCount > 0 ? "Safe Delete" : "Delete"}
        </button>
      </div>
      {message?.message ? (
        <p className={message.status === "success" ? styles.inlineSuccess : styles.inlineError}>{message.message}</p>
      ) : null}
    </div>
  );
}
