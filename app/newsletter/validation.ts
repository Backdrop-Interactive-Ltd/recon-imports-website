import { z } from "zod";

export type NewsletterActionState = {
  errors?: Partial<Record<"email" | "form", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialNewsletterActionState: NewsletterActionState = {
  message: "",
  status: "idle",
};

export const newsletterSubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Use a valid email address.")
    .max(160, "Email address is too long.")
    .transform((email) => email.toLowerCase()),
});

export const newsletterSubscriberIdSchema = z.string().trim().min(1, "Subscriber id is required.");
