import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";

// Only the adapter provides this request-scoped context. Ordinary Next/Node
// development, builds and VPS hosting continue using DATABASE_URL.
export function getWorkersDatabaseContext() {
  let context;
  try {
    context = getCloudflareContext();
  } catch {
    return undefined;
  }
  const env = context.env as typeof context.env & {
    HYPERDRIVE?: { connectionString: string };
    DATABASE_URL?: string;
  };
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) throw new Error("Workers requires HYPERDRIVE or a DATABASE_URL secret.");
  return { request: context.ctx, connectionString };
}
