import { z } from "zod";
import { LeadStatus } from "../../../../lib/generated/prisma/enums";

export const sellCarLeadStatusOptions = [LeadStatus.NEW, LeadStatus.REVIEWED, LeadStatus.CONTACTED, LeadStatus.CLOSED] as const;

export type SellCarLeadActionState = {
  errors?: Partial<Record<"form" | "id" | "status", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const sellCarLeadIdSchema = z.string().trim().min(1, "Lead id is required.");

export const sellCarLeadStatusSchema = z.enum(sellCarLeadStatusOptions, {
  error: "Choose a valid lead status.",
});

export function formatLeadStatus(status: LeadStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
