import { z } from "zod";
export type { MediaActionState } from "./formState";

export const mediaIdSchema = z.string().trim().min(1, "Media id is required.");
