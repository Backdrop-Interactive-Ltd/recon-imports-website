import QRCode from "qrcode";
import { getEmployeeProfileUrl } from "./profileUrls";

export async function generateEmployeeQr(employeeCode: string): Promise<Buffer> {
  // Never use the request Host, AUTH_URL or localhost for permanent identity links.
  return QRCode.toBuffer(getEmployeeProfileUrl(employeeCode), {
    type: "png", errorCorrectionLevel: "H", margin: 4, scale: 10,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
