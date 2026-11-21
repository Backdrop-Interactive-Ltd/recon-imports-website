import type { QRCodeToBufferOptions } from "qrcode";
import { createHash } from "node:crypto";
import { getEmployeeProfileUrl } from "./profileUrls";

const options = { type: "png", errorCorrectionLevel: "H", margin: 4, scale: 10,
  color: { dark: "#000000ff", light: "#ffffffff" } } as const satisfies QRCodeToBufferOptions;

// Validator describes only deterministic public URL pixels, never permissions or employee data.
export function getEmployeeQrEtag(employeeCode: string): string {
  return 'W/"' + createHash("sha256").update(getEmployeeProfileUrl(employeeCode) + JSON.stringify(options)).digest("hex") + '"';
}
export async function generateEmployeeQr(employeeCode: string): Promise<Buffer> {
  const url = getEmployeeProfileUrl(employeeCode);
  const { default: QRCode } = await import("qrcode");
  return QRCode.toBuffer(url, options);
}
