"use client";

import { useState, useTransition } from "react";
import styles from "../brands/page.module.css";
import { deleteMediaRecordAction } from "./actions";
import type { MediaActionState } from "./validation";

type MediaRowActionsProps = {
  fileName: string;
  fileUrl: string;
  mediaId: string;
};

export default function MediaRowActions({ fileName, fileUrl, mediaId }: MediaRowActionsProps) {
  const [message, setMessage] = useState<MediaActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fileUrl);
      setMessage({
        message: "Image URL copied.",
        status: "success",
      });
    } catch {
      setMessage({
        message: "Copy failed. Open the image and copy the URL manually.",
        status: "error",
      });
    }
  }

  function handleDelete() {
    if (!window.confirm(`Delete the media library record for ${fileName}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteMediaRecordAction(mediaId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <button className={styles.secondaryButton} disabled={isPending} onClick={handleCopy} type="button">
          Copy URL
        </button>
        <a className={styles.secondaryButton} href={fileUrl} target="_blank" rel="noreferrer">
          Open
        </a>
        <button className={styles.dangerButton} disabled={isPending} onClick={handleDelete} type="button">
          Delete Record
        </button>
      </div>
      {message?.message ? (
        <p className={message.status === "success" ? styles.inlineSuccess : styles.inlineError}>{message.message}</p>
      ) : null}
    </div>
  );
}
