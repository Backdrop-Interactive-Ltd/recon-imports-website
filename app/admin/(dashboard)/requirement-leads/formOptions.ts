import { LeadStatus } from "../../../../lib/generated/prisma/enums";

export const requirementLeadStatusOptions = [LeadStatus.NEW, LeadStatus.REVIEWED, LeadStatus.CONTACTED, LeadStatus.CLOSED] as const;

export type RequirementLeadActionState = {
  errors?: Partial<Record<"form" | "id" | "status", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export function formatLeadStatus(status: LeadStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
