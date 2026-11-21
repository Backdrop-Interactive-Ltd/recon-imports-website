import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdminPermission, requireAdminRenderPermission, AdminAuthorizationError } from "../adminAuthorization";
import { hasAdminPermission, type AdminPermission, type AdminRole } from "../adminPermissions";
import { EmployeeDomainError } from "./services";
import { isEmployeeCode } from "./identifiers";
import { getEmployeeBusinessStatus } from "./status";
import { getEmployeeProfilePath, getEmployeeProfileUrl } from "./profileUrls";
import type { Prisma } from "../generated/prisma/client";

const select = { id: true, employeeCode: true, internalName: true, employmentStatus: true, archivedAt: true, personalDataErasedAt: true, version: true, createdAt: true, updatedAt: true } as const;
function present(employee: Prisma.EmployeeGetPayload<{ select: typeof select }>) {
  return { ...employee, employmentStatus: getEmployeeBusinessStatus(employee.employmentStatus), profilePath: getEmployeeProfilePath(employee.employeeCode), profileUrl: getEmployeeProfileUrl(employee.employeeCode) };
}
async function read<T>(query: (tx: Prisma.TransactionClient, role: AdminRole) => Promise<T>, permission: AdminPermission = "employees.records.read", authorize = requireAdminPermission) {
  const actor = await authorize(permission);
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id"=${actor.id} FOR SHARE`;
      const current = await tx.adminUser.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true } });
      if (!current?.isActive || !hasAdminPermission(current.role, permission)) throw new AdminAuthorizationError("FORBIDDEN");
      return query(tx, current.role);
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
type SelectedEmployee = Prisma.EmployeeGetPayload<{ select: typeof select }>;
function validatePages(...pages: number[]) {
  if (!pages.every(page => pageSchema.safeParse(page).success)) throw new EmployeeDomainError("VALIDATION");
}
async function editorData(tx: Prisma.TransactionClient, employee: SelectedEmployee, page: number) {
  const [profiles, profileCount, draftCount, departments] = await Promise.all([
    tx.employeePublicProfile.findMany({ where: { employeeId: employee.id }, orderBy: { revision: "desc" }, skip: (page - 1) * 5, take: 5,
      select: { id: true, revision: true, state: true, version: true, publicName: true, designation: true, biography: true, experienceSummary: true, departmentId: true, departmentName: true, officialPhone: true, officialEmail: true, displayOrder: true, isFeatured: true, portraitStorageKey: true, portraitStorageVersion: true } }),
    tx.employeePublicProfile.count({ where: { employeeId: employee.id } }),
    tx.employeePublicProfile.count({ where: { employeeId: employee.id, state: "DRAFT" } }),
    tx.department.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], take: 100 }),
  ]);
  return { employee: present(employee), profiles, profileCount, hasDraft: draftCount > 0, departments };
}
async function approvalData(tx: Prisma.TransactionClient, employee: { id: string; publicationEpoch: number }, approvalPage: number) {
  const [approvals, approvalCount] = await Promise.all([
      tx.employeePublicationApproval.findMany({ where: { employeeId: employee.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (approvalPage - 1) * 20, take: 20,
        select: { id: true, profileRevision: true, scope: true, status: true, isPublished: true, employmentEpoch: true, consentReference: true, consentPolicyVersion: true, consentRecordedAt: true, consentExpiresAt: true, withdrawnAt: true, evidenceErasedAt: true, publishPhone: true, publishEmail: true, publishPortrait: true, selfApproved: true, decidedAt: true } }),
      tx.employeePublicationApproval.count({ where: { employeeId: employee.id } }),
  ]);
  return { approvals, approvalCount, publicationEpoch: employee.publicationEpoch };
}
async function historyData(tx: Prisma.TransactionClient, employee: { id: string }, historyPage: number) {
  const [history, historyCount] = await Promise.all([
      tx.employeeAuditEvent.findMany({ where: { employeeId: employee.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (historyPage - 1) * 20, take: 20,
        select: { id: true, eventType: true, actorRole: true, recordVersion: true, profileRevision: true, changedFields: true, isSelfApproval: true, createdAt: true } }),
      tx.employeeAuditEvent.count({ where: { employeeId: employee.id } }),
  ]);
  return { history, historyCount };
}
// One locked actor check and employee lookup. No audit/history work in the initial DTO.
export async function getEmployeePageData(employeeCode: string, page = 1, approvalPage = 1) {
  return read(async (tx, role) => {
    if (!isEmployeeCode(employeeCode)) return null;
    validatePages(page, approvalPage);
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select: { ...select, publicationEpoch: true } });
    if (!employee) return null;
    const [editor, review] = await Promise.all([
      editorData(tx, employee, page),
      hasAdminPermission(role, "employees.restricted.read") ? approvalData(tx, employee, approvalPage) : Promise.resolve(null),
    ]);
    return { ...editor, actorRole: role, review };
  }, "employees.records.read", requireAdminRenderPermission);
}
export async function getEmployeeEditorData(employeeCode: string, page = 1) {
  return read(async tx => {
    if (!isEmployeeCode(employeeCode)) return null;
    validatePages(page);
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select });
    return employee ? editorData(tx, employee, page) : null;
  }, "employees.records.read", requireAdminRenderPermission);
}
export async function getEmployeeDepartmentOptions() {
  return read(tx => tx.department.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], take: 100 }));
}
// Retained for existing callers with the original restricted permission and bounded projections.
export async function getEmployeeReviewData(employeeCode: string, approvalPage = 1, historyPage = 1) {
  return read(async tx => {
    if (!isEmployeeCode(employeeCode)) return null;
    validatePages(approvalPage, historyPage);
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select: { id: true, publicationEpoch: true } });
    if (!employee) return null;
    const [approvals, history] = await Promise.all([approvalData(tx, employee, approvalPage), historyData(tx, employee, historyPage)]);
    return { ...approvals, ...history };
  }, "employees.restricted.read", requireAdminRenderPermission);
}
// Sensitive explicit history requests use fresh authorization plus the transaction actor check.
export async function getEmployeeHistoryData(employeeCode: string, page = 1) {
  return read(async tx => {
    if (!isEmployeeCode(employeeCode)) return null;
    validatePages(page);
    const employee = await tx.employee.findUnique({ where: { employeeCode }, select: { id: true } });
    return employee ? { employeeCode, ...await historyData(tx, employee, page) } : null;
  }, "employees.restricted.read");
}
