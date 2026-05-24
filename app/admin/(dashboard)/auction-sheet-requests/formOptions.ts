import { AuctionSheetStatus, PaymentStatus } from "../../../../lib/generated/prisma/enums";

export const auctionSheetStatusOptions = Object.values(AuctionSheetStatus);
export const paymentStatusOptions = [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.FAILED] as const;

export type AuctionSheetAdminActionState = {
  errors?: Partial<Record<"form" | "id" | "paymentStatus" | "reportUrl" | "status", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
