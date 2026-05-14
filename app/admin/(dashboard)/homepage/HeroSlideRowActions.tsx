"use client";

import { useState, useTransition } from "react";
import styles from "../brands/page.module.css";
import { deleteHeroSlideAction, setHeroSlideActiveAction } from "./actions";
import type { HeroSlideActionState } from "./validation";

type HeroSlideRowActionsProps = {
  isActive: boolean;
  slideId: string;
  slideTitle: string;
};

export default function HeroSlideRowActions({ isActive, slideId, slideTitle }: HeroSlideRowActionsProps) {
  const [message, setMessage] = useState<HeroSlideActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange() {
    startTransition(async () => {
      setMessage(await setHeroSlideActiveAction(slideId, !isActive));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${slideTitle}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteHeroSlideAction(slideId));
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
