import { z } from "zod";
import { sellCarLeadStatusOptions } from "./formOptions";
export type { SellCarLeadActionState } from "./formOptions";

export const sellCarLeadIdSchema = z.string().trim().min(1, "Lead id is required.");

export const sellCarLeadStatusSchema = z.enum(sellCarLeadStatusOptions, {
  error: "Choose a valid lead status.",
});
