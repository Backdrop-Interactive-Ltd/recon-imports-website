import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { hasAdminPermission, isAdminRole, type AdminPermission, type AdminRole } from "./adminPermissions";

export type CurrentAdmin = { id: string; name: string; email: string; role: AdminRole };
export type AuthorizationCode = "UNAUTHENTICATED" | "FORBIDDEN" | "UNAVAILABLE";

export class AdminAuthorizationError extends Error {
  constructor(public readonly code: AuthorizationCode) {
    super(code === "UNAVAILABLE" ? "Authorization is temporarily unavailable." : "Access denied.");
    this.name = "AdminAuthorizationError";
  }
}

// Never persistently cache this lookup: account/role changes apply on the next request.
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    const session = await auth();
    const id = (session?.user as { id?: unknown } | undefined)?.id;
    if (typeof id !== "string" || !id.trim()) return null;
    const account = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!account?.isActive || !isAdminRole(account.role)) return null;
    return { id: account.id, name: account.name, email: account.email, role: account.role };
  } catch {
    // Do not expose database/authentication details or authorize from stale claims.
    throw new AdminAuthorizationError("UNAVAILABLE");
  }
}

export async function requireAdminPermission(permission: AdminPermission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AdminAuthorizationError("UNAUTHENTICATED");
  if (!hasAdminPermission(admin.role, permission)) throw new AdminAuthorizationError("FORBIDDEN");
  return admin;
}

export async function requireAdminPagePermission(permission: AdminPermission): Promise<CurrentAdmin> {
  try {
    return await requireAdminPermission(permission);
  } catch (error) {
    if (!(error instanceof AdminAuthorizationError)) throw error;
    if (error.code === "FORBIDDEN") redirect("/admin");
    if (error.code === "UNAVAILABLE") redirect("/admin/login?error=DatabaseUnavailable");
    redirect("/admin/login");
  }
}
