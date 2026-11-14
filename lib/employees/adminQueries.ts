import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdminPermission, AdminAuthorizationError } from "../adminAuthorization";
import { hasAdminPermission, type AdminPermission } from "../adminPermissions";
import { EmployeeDomainError } from "./services";
import { isEmployeeCode } from "./identifiers";
import { getEmployeeBusinessStatus } from "./status";
import { getEmployeeProfilePath, getEmployeeProfileUrl } from "./profileUrls";
import type { Prisma } from "../generated/prisma/client";

const select = { id: true, employeeCode: true, internalName: true, employmentStatus: true, archivedAt: true, personalDataErasedAt: true, version: true, createdAt: true, updatedAt: true } as const;
function present(employee: Prisma.EmployeeGetPayload<{ select: typeof select }>) {
  return { ...employee, employmentStatus: getEmployeeBusinessStatus(employee.employmentStatus), profilePath: getEmployeeProfilePath(employee.employeeCode), profileUrl: getEmployeeProfileUrl(employee.employeeCode) };
}
async function read<T>(query: (tx: Prisma.TransactionClient) => Promise<T>, permission: AdminPermission = "employees.records.read") {
  const actor = await requireAdminPermission(permission);
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id"=${actor.id} FOR SHARE`;
      const current = await tx.adminUser.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true } });
      if (!current?.isActive || !hasAdminPermission(current.role, permission)) throw new AdminAuthorizationError("FORBIDDEN");
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

const pageSchema = z.number().int().min(1).max(10000);
// Explicit projections: never serialize identities, raw model records.
export async function getEmployeeEditorData(employeeCode: string, page = 1) {
  return read(async tx => {
    if (!isEmployeeCode(employeeCode)) return null;
    if (!pageSchema.safeParse(page).success) throw new EmployeeDomainError("VALIDATION");
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select });
    if (!employee) return null;
    const [profiles, profileCount, draftCount, departments] = await Promise.all([
      tx.employeePublicProfile.findMany({ where: { employeeId: employee.id }, orderBy: { revision: "desc" }, skip: (page - 1) * 5, take: 5,
        select: { id: true, revision: true, state: true, version: true, publicName: true, designation: true, biography: true, experienceSummary: true, departmentId: true, departmentName: true, officialPhone: true, officialEmail: true, displayOrder: true, isFeatured: true, portraitStorageKey: true, portraitStorageVersion: true } }),
      tx.employeePublicProfile.count({ where: { employeeId: employee.id } }),
      tx.employeePublicProfile.count({ where: { employeeId: employee.id, state: "DRAFT" } }),
      tx.department.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], take: 100 }),
    ]);
    return { employee: present(employee), profiles, profileCount, hasDraft: draftCount > 0, departments };
  });
}

export async function getEmployeeDepartmentOptions() {
  return read(tx => tx.department.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], take: 100 }));
}

// Consent evidence references and audit metadata require a stronger permission
// than record/draft access. Recheck it in the same transaction as the reads.
export async function getEmployeeReviewData(employeeCode: string, approvalPage = 1, historyPage = 1) {
  return read(async tx => {
    if (!isEmployeeCode(employeeCode)) return null;
    if (![approvalPage, historyPage].every(page => pageSchema.safeParse(page).success)) throw new EmployeeDomainError("VALIDATION");
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select: { id: true, publicationEpoch: true } });
    if (!employee) return null;
    const [approvals, approvalCount, history, historyCount] = await Promise.all([
      tx.employeePublicationApproval.findMany({ where: { employeeId: employee.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (approvalPage - 1) * 20, take: 20,
        select: { id: true, profileRevision: true, scope: true, status: true, isPublished: true, employmentEpoch: true, consentReference: true, consentPolicyVersion: true, consentRecordedAt: true, consentExpiresAt: true, withdrawnAt: true, evidenceErasedAt: true, publishPhone: true, publishEmail: true, publishPortrait: true, selfApproved: true, decidedAt: true } }),
      tx.employeePublicationApproval.count({ where: { employeeId: employee.id } }),
      tx.employeeAuditEvent.findMany({ where: { employeeId: employee.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (historyPage - 1) * 20, take: 20,
        select: { id: true, eventType: true, actorRole: true, recordVersion: true, profileRevision: true, changedFields: true, isSelfApproval: true, createdAt: true } }),
      tx.employeeAuditEvent.count({ where: { employeeId: employee.id } }),
    ]);
    return { approvals, approvalCount, history, historyCount, publicationEpoch: employee.publicationEpoch };
  }, "employees.restricted.read");
}
