import { z } from "zod";
export type { NewsletterSubscriberActionState } from "./formState";

export const newsletterSubscriberIdSchema = z.string().trim().min(1, "Subscriber id is required.");
