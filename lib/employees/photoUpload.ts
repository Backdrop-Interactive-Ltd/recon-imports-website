import { getCloudinaryConfig, uploadImageBuffer } from "../uploads/cloudinary";
import { getWorkersImagesBinding } from "../runtime/cloudflare";
import { rasterFormat, stripPortraitWebpMetadata } from "./photoRaster";

// Public storage by owner choice: publication controls website display, not URL access.
export async function prepareEmployeePhoto(file: File, employeeId: string) {
  if (!getCloudinaryConfig()) throw new Error("PHOTO_CLOUDINARY_UNAVAILABLE");
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(employeeId)) throw new Error("Invalid employee.");
  if (file.size < 1 || file.size > 3 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error("Invalid photo.");
  const source = Buffer.from(await file.arrayBuffer());
  const format = rasterFormat(source);
  const images = getWorkersImagesBinding();
  let buffer: Buffer;
  if (images) {
    try {
      const stream = () => new Blob([new Uint8Array(source)]).stream();
      const info = await images.info(stream());
      if (info.format !== format || !Number.isSafeInteger(info.width) || !Number.isSafeInteger(info.height) ||
          info.width! < 1 || info.height! < 1 || info.width! * info.height! > 20_000_000) throw new Error("Invalid photo.");
      const output = await images.input(stream()).transform({ width: 1600, height: 1600, fit: "scale-down" })
        .output({ format: "image/webp", anim: false });
      const response = output.response();
      if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/webp")) throw new Error("Invalid photo.");
      buffer = Buffer.from(await response.arrayBuffer());
    } catch { throw new Error("Invalid photo."); }
  } else {
    const { processNodeEmployeePhoto } = await import("./photoProcessingNode");
    buffer = await processNodeEmployeePhoto(source);
  }
  buffer = stripPortraitWebpMetadata(buffer);
  const result = await uploadImageBuffer(buffer, `employees/${employeeId}`);
  if (!Number.isSafeInteger(result.version) || result.version < 1 || result.secure_url.length > 300) throw new Error("Invalid photo response.");
  return { url: result.secure_url, version: String(result.version) };
}
