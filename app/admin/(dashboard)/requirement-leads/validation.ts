import { z } from "zod";
import { requirementLeadStatusOptions } from "./formOptions";
export type { RequirementLeadActionState } from "./formOptions";

export const requirementLeadIdSchema = z.string().trim().min(1, "Lead id is required.");

export const requirementLeadStatusSchema = z.enum(requirementLeadStatusOptions, {
  error: "Choose a valid lead status.",
});
