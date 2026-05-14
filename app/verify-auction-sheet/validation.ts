import { z } from "zod";

export type AuctionSheetRequestActionState = {
  errors?: Partial<Record<"chassisNumber" | "email" | "form" | "name" | "phone" | "terms", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialAuctionSheetRequestActionState: AuctionSheetRequestActionState = {
  message: "",
  status: "idle",
};

export const auctionSheetRequestFormSchema = z.object({
  chassisNumber: z
    .string()
    .trim()
    .min(3, "Enter a valid chassis number.")
    .max(80, "Chassis number is too long.")
    .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphen only."),
  email: z.string().trim().email("Enter a valid email address.").max(120, "Email is too long."),
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number."),
  terms: z.literal(true, {
    error: "You must agree to the terms before submitting.",
  }),
});
