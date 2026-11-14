// Bounded container inspection supplements the real decoder, especially for animation.
export function rasterFormat(source: Buffer): "image/jpeg" | "image/png" | "image/webp" {
  if (source.length >= 3 && source[0] === 255 && source[1] === 216 && source[2] === 255) return "image/jpeg";
  if (source.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    let offset = 8;
    while (offset + 12 <= source.length) {
      const size = source.readUInt32BE(offset), type = source.toString("ascii", offset + 4, offset + 8);
      if (offset + size + 12 > source.length || type === "acTL" || type === "fcTL" || type === "fdAT") throw new Error("Invalid photo.");
      offset += size + 12;
      if (type === "IEND") return "image/png";
    }
    throw new Error("Invalid photo.");
  }
  if (source.toString("ascii", 0, 4) === "RIFF" && source.toString("ascii", 8, 12) === "WEBP") {
    webpChunks(source);
    return "image/webp";
  }
  throw new Error("Invalid photo.");
}

function webpChunks(source: Buffer) {
  if (source.length < 20 || source.readUInt32LE(4) + 8 !== source.length) throw new Error("Invalid photo.");
  const chunks: { type: string; data: Buffer }[] = [];
  let offset = 12;
  while (offset + 8 <= source.length) {
    const size = source.readUInt32LE(offset + 4), end = offset + 8 + size + (size % 2);
    const type = source.toString("ascii", offset, offset + 4);
    if (end > source.length || type === "ANIM" || type === "ANMF" || (type === "VP8X" && (size < 10 || (source[offset + 8] & 2)))) throw new Error("Invalid photo.");
    chunks.push({ type, data: source.subarray(offset, end) }); offset = end;
  }
  if (offset !== source.length || !chunks.some(c => c.type === "VP8 " || c.type === "VP8L")) throw new Error("Invalid photo.");
  return chunks;
}

// Strip EXIF/XMP/ICC chunks explicitly; the uploaded derivative never retains source metadata.
export function stripPortraitWebpMetadata(source: Buffer) {
  if (source.toString("ascii", 0, 4) !== "RIFF" || source.toString("ascii", 8, 12) !== "WEBP") throw new Error("Invalid photo.");
  const chunks = webpChunks(source).filter(c => !["EXIF", "XMP ", "ICCP"].includes(c.type)).map(c => {
    const data = Buffer.from(c.data);
    if (c.type === "VP8X") data[8] &= ~0x2c;
    return data;
  });
  const body = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
  const header = Buffer.alloc(8); header.write("RIFF"); header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
