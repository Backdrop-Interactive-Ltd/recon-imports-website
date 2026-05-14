"use client";

import { useState, useTransition } from "react";
import styles from "../brands/page.module.css";
import { deleteNewsletterSubscriberAction, setNewsletterSubscriberActiveAction } from "./actions";
import type { NewsletterSubscriberActionState } from "./validation";

type NewsletterSubscriberRowActionsProps = {
  email: string;
  isActive: boolean;
  subscriberId: string;
};

export default function NewsletterSubscriberRowActions({
  email,
  isActive,
  subscriberId,
}: NewsletterSubscriberRowActionsProps) {
  const [message, setMessage] = useState<NewsletterSubscriberActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleActiveChange() {
    startTransition(async () => {
      setMessage(await setNewsletterSubscriberActiveAction(subscriberId, !isActive));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${email}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteNewsletterSubscriberAction(subscriberId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <button className={styles.secondaryButton} disabled={isPending} onClick={handleActiveChange} type="button">
          {isActive ? "Deactivate" : "Reactivate"}
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
