import { z } from "zod";
import { AuctionSheetStatus, PaymentStatus } from "../../../../lib/generated/prisma/enums";

export const auctionSheetStatusOptions = Object.values(AuctionSheetStatus);
export const paymentStatusOptions = [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.FAILED] as const;

export type AuctionSheetAdminActionState = {
  errors?: Partial<Record<"form" | "id" | "paymentStatus" | "reportUrl" | "status", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

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

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
