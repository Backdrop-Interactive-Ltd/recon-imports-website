import sharp from "sharp";

// Loaded only by ordinary Node.js/Next development or VPS requests, never Workers.
export async function processNodeEmployeePhoto(source: Buffer) {
  const image = sharp(source, { limitInputPixels: 20_000_000 });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) !== 1) throw new Error("Invalid photo.");
  return image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp().toBuffer();
}
