import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Password is required."),
});

export const adminSeedEnvSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1, "ADMIN_NAME is required."),
  ADMIN_EMAIL: z.string().trim().email("ADMIN_EMAIL must be a valid email.").transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
