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

// A Worker missing IMAGES must fail closed; never try loading native Sharp there.
export function getWorkersImagesBinding(): WorkerImagesBinding | undefined {
  let context;
  try { context = getCloudflareContext(); } catch {
    if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") throw new Error("PHOTO_IMAGES_UNAVAILABLE");
    return undefined;
  }
  const images = (context.env as typeof context.env & { IMAGES?: WorkerImagesBinding }).IMAGES;
  if (!images) throw new Error("PHOTO_IMAGES_UNAVAILABLE");
  return images;
}

export type WorkerImagesBinding = {
  info(stream: ReadableStream<Uint8Array>): Promise<{ format: string; width?: number; height?: number }>;
  input(stream: ReadableStream<Uint8Array>): {
    transform(options: { width: number; height: number; fit: "scale-down" }): {
      output(options: { format: "image/webp"; anim: false }): Promise<{ response(): Response }>;
    };
  };
};
