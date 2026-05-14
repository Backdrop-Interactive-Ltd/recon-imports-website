import { z } from "zod";

export type NewsletterSubscriberActionState = {
  errors?: Partial<Record<"form" | "id", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const newsletterSubscriberIdSchema = z.string().trim().min(1, "Subscriber id is required.");
