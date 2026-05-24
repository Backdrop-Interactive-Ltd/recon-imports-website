"use client";

import { useState, useTransition } from "react";
import { deleteCarAction, setCarFeaturedAction, setCarPublishedAction, setCarSaleStatusAction } from "./actions";
import styles from "../brands/page.module.css";
import { formatEnumLabel, saleStatusOptions, type CarActionState } from "./formOptions";
import type { CarSaleStatus } from "../../../../lib/generated/prisma/enums";

type CarRowActionsProps = {
  carId: string;
  carTitle: string;
  isFeatured: boolean;
  isPublished: boolean;
  saleStatus: CarSaleStatus;
};

export default function CarRowActions({ carId, carTitle, isFeatured, isPublished, saleStatus }: CarRowActionsProps) {
  const [message, setMessage] = useState<CarActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePublishedChange() {
    startTransition(async () => {
      setMessage(await setCarPublishedAction(carId, !isPublished));
    });
  }

  function handleFeaturedChange() {
    startTransition(async () => {
      setMessage(await setCarFeaturedAction(carId, !isFeatured));
    });
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${carTitle}?`)) {
      return;
    }

    startTransition(async () => {
      setMessage(await deleteCarAction(carId));
    });
  }

  return (
    <div className={styles.rowActions}>
      <div className={styles.rowButtons}>
        <button className={styles.secondaryButton} disabled={isPending} onClick={handlePublishedChange} type="button">
          {isPublished ? "Unpublish" : "Publish"}
        </button>
        <button className={styles.secondaryButton} disabled={isPending} onClick={handleFeaturedChange} type="button">
          {isFeatured ? "Unfeature" : "Feature"}
        </button>
        <button className={styles.dangerButton} disabled={isPending} onClick={handleDelete} type="button">
          Delete
        </button>
        <select
          aria-label={`Sale status for ${carTitle}`}
          className={styles.statusSelect}
          defaultValue={saleStatus}
          disabled={isPending}
          onChange={(event) => {
            const nextSaleStatus = event.target.value;
            startTransition(async () => {
              setMessage(await setCarSaleStatusAction(carId, nextSaleStatus));
            });
          }}
        >
          {saleStatusOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </div>
      {message?.message ? (
        <p className={message.status === "success" ? styles.inlineSuccess : styles.inlineError}>{message.message}</p>
      ) : null}
    </div>
  );
}
