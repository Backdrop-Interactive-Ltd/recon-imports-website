import { NextResponse } from "next/server";
import { AdminAuthorizationError, requireAdminPermission } from "../../../../../../lib/adminAuthorization";
import { getEmployeeByCode } from "../../../../../../lib/employees/adminQueries";
import { isEmployeeCode } from "../../../../../../lib/employees/identifiers";
import { generateEmployeeQr } from "../../../../../../lib/employees/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ employeeCode: string }> }) {
  try {
    await requireAdminPermission("employees.qr.export");
    const { employeeCode } = await params;
    if (!isEmployeeCode(employeeCode)) return NextResponse.json({ error: "Profile not found." }, { status: 404, headers });
    const employee = await getEmployeeByCode(employeeCode);
    if (!employee || employee.personalDataErasedAt) return NextResponse.json({ error: "Profile not found." }, { status: 404, headers });
    const png = await generateEmployeeQr(employee.employeeCode);
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(new Uint8Array(png), { headers: {
      ...headers, "Content-Type": "image/png",
      "Content-Disposition": `${disposition}; filename="${employee.employeeCode}-qr.png"`,
    } });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: "QR access denied." }, {
      status: error.code === "UNAVAILABLE" ? 503 : error.code === "FORBIDDEN" ? 403 : 401, headers,
    });
    return NextResponse.json({ error: "QR code is temporarily unavailable." }, { status: 503, headers });
  }
}
