import { z } from "zod";
import { paymentMethodOptions } from "./formOptions";
export type { AuctionSheetRequestActionState } from "./formOptions";

export const auctionSheetRequestFormSchema = z.object({
  chassisNumber: z
    .string()
    .trim()
    .min(3, "Enter a valid chassis number.")
    .max(80, "Chassis number is too long.")
    .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphen only."),
  email: z.string().trim().email("Enter a valid email address.").max(120, "Email is too long."),
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  paymentMethod: z.enum(paymentMethodOptions, {
    error: "Choose a payment method.",
  }),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number."),
  senderNumber: z
    .string()
    .trim()
    .min(7, "Enter the sender number used for payment.")
    .max(40, "Sender number is too long.")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid sender number."),
  terms: z.literal(true, {
    error: "You must agree to the terms before submitting.",
  }),
  transactionId: z
    .string()
    .trim()
    .min(4, "Transaction ID is required.")
    .max(100, "Transaction ID is too long.")
    .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphen only."),
});
