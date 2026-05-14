import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Parse server environment variables when backend code needs them.
export function parseServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse(env);
}
