import type { UploadApiResponse } from "cloudinary";
import { getOptimizedCloudinaryImageUrl } from "../cloudinaryImages";

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    cloudName,
  };
}

export function configureCloudinary() {
  const config = getCloudinaryConfig();

  if (!config) {
    return false;
  }

  return true;
}

export async function uploadImageBuffer(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  const config = getCloudinaryConfig();
  if (!config) throw new Error("Cloudinary is not configured.");
  // Signed HTTPS multipart requests work in Node and workerd without Node's
  // stream/https upload implementation. Secrets never reach the browser.
  const params = {
    folder: `recon-imports/admin/${folder}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    unique_filename: "true",
    use_filename: "true",
  };
  const payload = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join("&") + config.apiSecret;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.set(key, value);
  form.set("api_key", config.apiKey);
  form.set("signature", signature);
  form.set("file", new Blob([new Uint8Array(buffer)]), "upload");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, {
    method: "POST", body: form, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Cloudinary upload failed.");
  const result = await response.json() as UploadApiResponse;
  if (typeof result.public_id !== "string" || typeof result.secure_url !== "string" ||
      !result.secure_url.startsWith("https://res.cloudinary.com/")) {
    throw new Error("Cloudinary did not return a valid upload result.");
  }
  return result;
}

export function getUploadedImageDeliveryUrl(result: UploadApiResponse) {
  return getOptimizedCloudinaryImageUrl(result.secure_url);
}
