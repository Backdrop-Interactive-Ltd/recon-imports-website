import { z } from "zod";
export type { RequirementLeadActionState } from "./formState";

export const requirementLeadFormSchema = z.object({
  carName: z.string().trim().min(1, "Car name is required.").max(100, "Car name is too long."),
  details: z.string().trim().max(500, "Details are too long.").optional(),
  mileage: z.string().trim().max(80, "Mileage is too long.").optional(),
  model: z.string().trim().max(80, "Model is too long.").optional(),
  modelYear: z.string().trim().max(30, "Model year is too long.").optional(),
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number."),
});
