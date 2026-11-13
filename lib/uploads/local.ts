import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export async function uploadLocalDevelopmentImage(buffer: Buffer, folder: string) {
  if (process.env.NODE_ENV !== "development") throw new Error("Local uploads require development mode.");
  const image = await sharp(buffer, { limitInputPixels: 40_000_000 }).png().toBuffer();
  const filename = `${randomUUID()}.png`;
  const directory = join(process.cwd(), "public", "uploads", folder);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), image, { flag: "wx" });
  return { deliveryUrl: `/uploads/${folder}/${filename}`, publicId: `local/${folder}/${filename}` };
}
