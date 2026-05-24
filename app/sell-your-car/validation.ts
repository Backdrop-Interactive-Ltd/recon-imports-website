import { z } from "zod";
export type { SellCarLeadActionState } from "./formState";

export const sellCarLeadFormSchema = z.object({
  carName: z.string().trim().min(1, "Car name is required.").max(100, "Car name is too long."),
  mileage: z.string().trim().max(80, "Mileage is too long.").optional(),
  model: z.string().trim().max(80, "Model is too long.").optional(),
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  offeredPrice: z.string().trim().max(80, "Offered price is too long.").optional(),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number."),
  registrationYear: z.string().trim().max(30, "Registration year is too long.").optional(),
  terms: z.literal(true, {
    error: "You must accept the Terms Of Use.",
  }),
});
