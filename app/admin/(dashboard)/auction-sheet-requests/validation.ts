import { z } from "zod";
import { auctionSheetStatusOptions, paymentStatusOptions } from "./formOptions";
export type { AuctionSheetAdminActionState } from "./formOptions";

export const auctionSheetRequestIdSchema = z.string().trim().min(1, "Request id is required.");

export const auctionSheetStatusSchema = z.enum(auctionSheetStatusOptions, {
  error: "Choose a valid request status.",
});

export const paymentStatusSchema = z.enum(paymentStatusOptions, {
  error: "Choose a valid payment status.",
});

export const reportUrlSchema = z
  .string()
  .trim()
  .max(500, "Report URL is too long.")
  .optional()
  .superRefine((value, context) => {
    if (!value) return;
    if (value.startsWith("/")) return;

    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") return;
    } catch {
      // Handled below.
    }

    context.addIssue({
      code: "custom",
      message: "Use a full http/https URL or a site-relative path starting with /.",
    });
  });
