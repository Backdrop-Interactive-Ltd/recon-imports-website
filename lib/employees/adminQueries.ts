import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdminPermission, AdminAuthorizationError } from "../adminAuthorization";
import { hasAdminPermission } from "../adminPermissions";
import { EmployeeDomainError } from "./services";
import { isEmployeeCode } from "./identifiers";
import { getEmployeeBusinessStatus } from "./status";
import { getEmployeeProfilePath, getEmployeeProfileUrl } from "./profileUrls";
import type { Prisma } from "../generated/prisma/client";

const select = { id: true, employeeCode: true, internalName: true, employmentStatus: true, archivedAt: true, personalDataErasedAt: true, version: true, createdAt: true, updatedAt: true } as const;
function present(employee: Prisma.EmployeeGetPayload<{ select: typeof select }>) {
  return { ...employee, employmentStatus: getEmployeeBusinessStatus(employee.employmentStatus), profilePath: getEmployeeProfilePath(employee.employeeCode), profileUrl: getEmployeeProfileUrl(employee.employeeCode) };
}
async function read<T>(query: (tx: Prisma.TransactionClient) => Promise<T>) {
  const actor = await requireAdminPermission("employees.records.read");
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id"=${actor.id} FOR SHARE`;
      const current = await tx.adminUser.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true } });
      if (!current?.isActive || !hasAdminPermission(current.role, "employees.records.read")) throw new AdminAuthorizationError("FORBIDDEN");
      return query(tx);
    });
  } catch (error) {
    if (error instanceof AdminAuthorizationError || error instanceof EmployeeDomainError) throw error;
    throw new EmployeeDomainError("UNAVAILABLE");
  }
}
const listSchema = z.object({
  status: z.enum(["ALL", "ACTIVE", "INACTIVE", "RESIGNED", "ARCHIVED"]).default("ALL"),
  search: z.string().trim().max(120).default(""),
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
}).strict();
export async function listEmployeesForAdmin(input: unknown = {}) {
  return read(async tx => {
    const parsed = listSchema.safeParse(input);
    if (!parsed.success) throw new EmployeeDomainError("VALIDATION");
    const { status, search, page, pageSize } = parsed.data;
    const where: Prisma.EmployeeWhereInput = {
      ...(status === "ARCHIVED" ? { OR: [{ archivedAt: { not: null } }, { employmentStatus: "FORMER" }] }
        : status === "RESIGNED" ? { employmentStatus: "FORMER" }
        : status === "ALL" ? {} : { employmentStatus: status, archivedAt: null }),
      ...(search ? { employeeCode: { contains: search, mode: "insensitive" } } : {}),
    };
    return (await tx.employee.findMany({ where, select, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize })).map(present);
  });
}
export async function getEmployeeByCode(employeeCode: string) {
  return read(async tx => {
    if (!isEmployeeCode(employeeCode)) return null;
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select });
    return employee ? present(employee) : null;
  });
}
