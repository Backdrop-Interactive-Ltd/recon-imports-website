import { z } from "zod";

export type MediaActionState = {
  errors?: Partial<Record<"form" | "id", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const mediaIdSchema = z.string().trim().min(1, "Media id is required.");
