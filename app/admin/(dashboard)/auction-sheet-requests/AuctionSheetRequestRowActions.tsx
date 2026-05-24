"use client";

import { useState, useTransition } from "react";
import type { AuctionSheetStatus, PaymentStatus } from "../../../../lib/generated/prisma/enums";
import styles from "../brands/page.module.css";
import {
  deleteAuctionSheetRequestAction,
  updateAuctionSheetPaymentStatusAction,
  updateAuctionSheetReportUrlAction,
  updateAuctionSheetStatusAction,
} from "./actions";
import {
  auctionSheetStatusOptions,
  formatEnumLabel,
  paymentStatusOptions,
  type AuctionSheetAdminActionState,
} from "./formOptions";

type AuctionSheetRequestRowActionsProps = {
  paymentStatus: PaymentStatus;
  reportUrl: string | null;
  requestId: string;
  requestLabel: string;
  status: AuctionSheetStatus;
};

export default function AuctionSheetRequestRowActions({
  paymentStatus,
  reportUrl,
  requestId,
  requestLabel,
  status,
}: AuctionSheetRequestRowActionsProps) {
  const [message, setMessage] = useState<AuctionSheetAdminActionState | null>(null);
  const [nextReportUrl, setNextReportUrl] = useState(reportUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(nextStatus: string) {
    startTransition(async () => {
      setMessage(await updateAuctionSheetStatusAction(requestId, nextStatus));
    });
  }

  function handlePaymentStatusChange(nextPaymentStatus: string) {
    startTransition(async () => {
      setMessage(await updateAuctionSheetPaymentStatusAction(requestId, nextPaymentStatus));
    });
  }

  function handleReportUrlSave() {
    startTransition(async () => {
      setMessage(await updateAuctionSheetReportUrlAction(requestId, nextReportUrl));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${requestLabel}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteAuctionSheetRequestAction(requestId));
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
          {auctionSheetStatusOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
        <select
          className={styles.statusSelect}
          disabled={isPending}
          onChange={(event) => handlePaymentStatusChange(event.target.value)}
          value={paymentStatus}
        >
          {paymentStatusOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
        <button className={styles.dangerButton} disabled={isPending} onClick={handleDelete} type="button">
          Delete
        </button>
      </div>

      <div className={styles.inlineForm}>
        <input
          disabled={isPending}
          onChange={(event) => setNextReportUrl(event.target.value)}
          placeholder="Report URL"
          type="text"
          value={nextReportUrl}
        />
        <button className={styles.secondaryButton} disabled={isPending} onClick={handleReportUrlSave} type="button">
          Save Report URL
        </button>
      </div>

      {message?.message ? (
        <p className={message.status === "success" ? styles.inlineSuccess : styles.inlineError}>{message.message}</p>
      ) : null}
    </div>
  );
}
