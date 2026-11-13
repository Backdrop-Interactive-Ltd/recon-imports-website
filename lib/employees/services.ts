import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, type Employee, type EmployeePublicProfile, type EmployeePublicationApproval } from "../generated/prisma/client";
import { prisma } from "../prisma";
import { requireAdminPermission, AdminAuthorizationError, type CurrentAdmin } from "../adminAuthorization";
import { hasAdminPermission, type AdminPermission } from "../adminPermissions";
import { formatEmployeeCode, generateVerificationKey } from "./identifiers";
import { getEmployeeDatabaseStatus, getEmployeeBusinessStatus } from "./status";
import { employeeCreateSchema, departmentSchema, draftSchema, employeeVersionSchema, revisionSchema, approvalRequestSchema, approvalActionSchema, employeeIdSchema, versionSchema } from "./validation";

type Tx = Prisma.TransactionClient;
export class EmployeeDomainError extends Error {
  constructor(public readonly code: "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "INELIGIBLE" | "UNAVAILABLE" | "PORTRAIT_STORAGE_PENDING" | "APPROVAL_REQUIRED" | "CONSENT_REQUIRED" | "CONSENT_EXPIRED" | "CONSENT_WITHDRAWN") {
    super(`Employee operation failed: ${code}.`); this.name = "EmployeeDomainError";
  }
}
class KeyCollision extends Error {}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const value = schema.safeParse(input);
  if (!value.success) throw new EmployeeDomainError("VALIDATION");
  return value.data;
}
function fail(code: ConstructorParameters<typeof EmployeeDomainError>[0]): never { throw new EmployeeDomainError(code); }

async function run<T>(permission: AdminPermission, operation: (tx: Tx, actor: CurrentAdmin) => Promise<T>): Promise<T> {
  const actor = await requireAdminPermission(permission);
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      // Protect the checked actor from a concurrent downgrade/deactivation until commit.
      await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id"=${actor.id} FOR SHARE`;
      const current = await tx.adminUser.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true } });
      if (!current?.isActive || !hasAdminPermission(current.role, permission)) throw new AdminAuthorizationError("FORBIDDEN");
      return operation(tx, { ...actor, role: current.role });
    }, { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 10000 });
  } catch (error) {
    if (error instanceof EmployeeDomainError || error instanceof AdminAuthorizationError || error instanceof KeyCollision) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002" && JSON.stringify(error.meta).includes("publicKey")) throw new KeyCollision();
      if (["P2002", "P2003", "P2004", "P2010", "P2025", "P2034"].includes(error.code)) fail("CONFLICT");
    }
    const sqlCode = (error as { cause?: { originalCode?: string } })?.cause?.originalCode;
    if (sqlCode && ["P0001", "23505", "23503", "23514", "23001", "40001", "40P01"].includes(sqlCode)) fail("CONFLICT");
    fail("UNAVAILABLE");
  }
}

async function lockEmployee(tx: Tx, id: string, version: number, allowArchived = false): Promise<Employee> {
  await tx.$queryRaw`SELECT "id" FROM "Employee" WHERE "id"=${id} FOR UPDATE`;
  const employee = await tx.employee.findUnique({ where: { id } });
  if (!employee) fail("NOT_FOUND");
  if (employee.version !== version) fail("CONFLICT");
  if (employee.personalDataErasedAt || (!allowArchived && employee.archivedAt)) fail("INELIGIBLE");
  return employee;
}
async function audit(tx: Tx, actor: CurrentAdmin, employee: Employee, eventType: Prisma.EmployeeAuditEventCreateInput["eventType"], changedFields: string[], revision?: number, self = false, suffix = "") {
  await tx.employeeAuditEvent.create({ data: {
    employeeId: employee.id, actorAdminId: actor.id, actorSnapshot: actor.id, actorRole: actor.role,
    eventType, recordVersion: employee.version, profileRevision: revision, changedFields,
    summary: suffix ? `${eventType}:${suffix}` : eventType, correlationId: randomUUID(), isSelfApproval: self,
  } });
}
async function bump(tx: Tx, employee: Employee, data: Prisma.EmployeeUncheckedUpdateInput = {}) {
  return tx.employee.update({ where: { id: employee.id }, data: { ...data, version: { increment: 1 } } });
}
async function departmentSnapshot(tx: Tx, departmentId: string | null | undefined) {
  if (!departmentId) return { departmentId: null, departmentName: null };
  const department = await tx.department.findUnique({ where: { id: departmentId } });
  if (!department?.isActive) fail("INELIGIBLE");
  return { departmentId: department.id, departmentName: department.name };
}
async function draftValues(tx: Tx, input: z.infer<typeof draftSchema>) {
  if (input.portraitStorageKey || input.portraitStorageVersion) fail("PORTRAIT_STORAGE_PENDING");
  const { departmentId, ...values } = input;
  return departmentId !== undefined ? { ...values, ...await departmentSnapshot(tx, departmentId) } : values;
}
async function profile(tx: Tx, employee: Employee, revision: number): Promise<EmployeePublicProfile> {
  const value = await tx.employeePublicProfile.findUnique({ where: { employeeId_revision: { employeeId: employee.id, revision } } });
  if (!value) fail("NOT_FOUND");
  return value;
}
async function approval(tx: Tx, employee: Employee, id: string): Promise<EmployeePublicationApproval> {
  const value = await tx.employeePublicationApproval.findFirst({ where: { id, employeeId: employee.id } });
  if (!value) fail("NOT_FOUND");
  return value;
}
function validConsent(value: { consentRecordedAt: Date | null; consentExpiresAt: Date | null; evidenceErasedAt: Date | null }) {
  const now = new Date();
  return !!value.consentRecordedAt && value.consentRecordedAt <= now && !value.evidenceErasedAt
    && (!value.consentExpiresAt || value.consentExpiresAt > now);
}
async function withdrawAll(tx: Tx, employeeId: string) {
  await tx.employeePublicationApproval.updateMany({ where: { employeeId, status: { not: "WITHDRAWN" } },
    data: { status: "WITHDRAWN", isPublished: false, withdrawnAt: new Date() } });
}
async function suspendPublication(tx: Tx, employee: Employee) {
  const published = await tx.employeePublicationApproval.findMany({ where: { employeeId: employee.id, isPublished: true }, select: { id: true } });
  await tx.employeePublicationApproval.updateMany({ where: { employeeId: employee.id, isPublished: true }, data: { isPublished: false } });
  return published.length ? published.map(value => value.id) : employee.reactivationApprovalIds;
}

export async function createEmployee(input: unknown) {
  return run("employees.draft.create", async (tx, actor) => {
    const data = parse(employeeCreateSchema, input);
    await departmentSnapshot(tx, data.departmentId);
    const [sequence] = await tx.$queryRaw<{ value: bigint }[]>`SELECT nextval('recon_employee_official_code_seq') AS value`;
    const employee = await tx.employee.create({ data: { ...data, employeeCode: formatEmployeeCode(sequence.value), revisionCounter: 1 } });
    await tx.employeePublicProfile.create({ data: { employeeId: employee.id, revision: 1, createdById: actor.id } });
    await audit(tx, actor, employee, "CREATED", ["employeeCode", "draft"], 1);
    return employee;
  });
}
export async function createDepartment(input: unknown) {
  return run("employees.policy.manage", async tx => tx.department.create({ data: parse(departmentSchema, input) }));
}
export async function updateDepartment(input: unknown) {
  return run("employees.policy.manage", async tx => {
    const data = parse(departmentSchema.extend({ id: employeeIdSchema, expectedVersion: versionSchema }), input);
    const { id, expectedVersion, ...values } = data;
    const updated = await tx.department.updateMany({ where: { id, version: expectedVersion }, data: { ...values, version: { increment: 1 } } });
    if (updated.count !== 1) fail("CONFLICT");
    return tx.department.findUniqueOrThrow({ where: { id } });
  });
}
export async function createDraftRevision(input: unknown) {
  return run("employees.draft.create", async (tx, actor) => {
    const data = parse(employeeVersionSchema.extend({ fields: draftSchema }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const values = await draftValues(tx, data.fields);
    const updated = await bump(tx, employee, { revisionCounter: { increment: 1 } });
    const created = await tx.employeePublicProfile.create({ data: { ...values, employeeId: employee.id, revision: updated.revisionCounter, createdById: actor.id } });
    await audit(tx, actor, updated, "DRAFT_SAVED", ["draft"], created.revision); return created;
  });
}
export async function saveEmployeeDraft(input: unknown) {
  return run("employees.draft.edit", async (tx, actor) => {
    const data = parse(revisionSchema.extend({ expectedProfileVersion: versionSchema, fields: draftSchema }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const draft = await profile(tx, employee, data.revision);
    if (draft.state !== "DRAFT") fail("INELIGIBLE");
    if (draft.version !== data.expectedProfileVersion) fail("CONFLICT");
    const values = await draftValues(tx, data.fields);
    const updatedDraft = await tx.employeePublicProfile.update({ where: { id: draft.id }, data: { ...values, version: { increment: 1 } } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "DRAFT_SAVED", Object.keys(data.fields), draft.revision); return updatedDraft;
  });
}
export async function submitEmployeeRevision(input: unknown) {
  return run("employees.revisions.submit", async (tx, actor) => {
    const data = parse(revisionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const draft = await profile(tx, employee, data.revision);
    if (draft.state !== "DRAFT" || !draft.publicName?.trim() || !draft.designation?.trim()) fail("INELIGIBLE");
    const submitted = await tx.employeePublicProfile.update({ where: { id: draft.id }, data: { state: "SUBMITTED", submittedAt: new Date(), submittedById: actor.id, submittedBySnapshot: actor.id, version: { increment: 1 } } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "REVISION_SUBMITTED", ["state"], draft.revision); return submitted;
  });
}
export async function requestPublicationApproval(input: unknown) {
  return run("employees.revisions.submit", async (tx, actor) => {
    const data = parse(approvalRequestSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const submitted = await profile(tx, employee, data.revision);
    if (submitted.state !== "SUBMITTED" || submitted.erasedAt) fail("INELIGIBLE");
    if (data.consentRecordedAt > new Date() || (data.consentExpiresAt && data.consentExpiresAt <= new Date())) fail("INELIGIBLE");
    if (data.publishPortrait) fail("PORTRAIT_STORAGE_PENDING");
    if ((data.publishPhone && !submitted.officialPhone) || (data.publishEmail && !submitted.officialEmail)) fail("INELIGIBLE");
    const { employeeId, expectedVersion: _version, revision, ...values } = data;
    const requested = await tx.employeePublicationApproval.create({ data: { ...values, employeeId, profileRevision: revision, employmentEpoch: employee.publicationEpoch } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "APPROVAL_REQUESTED", ["approval"], revision); return requested;
  });
}
export async function decidePublicationApproval(input: unknown) {
  return run("employees.revisions.approve", async (tx, actor) => {
    const data = parse(approvalActionSchema.extend({ decision: z.enum(["APPROVED", "REJECTED"]) }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const requested = await approval(tx, employee, data.approvalId);
    const submitted = await profile(tx, employee, requested.profileRevision);
    if (requested.status !== "PENDING" || requested.employmentEpoch !== employee.publicationEpoch || submitted.state !== "SUBMITTED" || !validConsent(requested)) fail("INELIGIBLE");
    const self = data.decision === "APPROVED" && submitted.submittedBySnapshot === actor.id;
    const decided = await tx.employeePublicationApproval.update({ where: { id: requested.id }, data: { status: data.decision, decidedAt: new Date(), decidedById: actor.id, decidedBySnapshot: actor.id, selfApproved: self } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, data.decision === "APPROVED" ? "REVISION_APPROVED" : "REVISION_REJECTED", ["status"], submitted.revision, self); return decided;
  });
}
export async function publishEmployeeProfile(input: unknown) {
  // Resolve scope only after authorization; both publication permissions are SUPER_ADMIN-only.
  return run("employees.directory.publish", async (tx, actor) => {
    const data = parse(approvalActionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const approved = await approval(tx, employee, data.approvalId);
    if (approved.scope === "VERIFICATION" && !hasAdminPermission(actor.role, "employees.verification.publish")) throw new AdminAuthorizationError("FORBIDDEN");
    if (employee.employmentStatus !== "ACTIVE" || approved.status !== "APPROVED" || approved.withdrawnAt || approved.employmentEpoch !== employee.publicationEpoch || !validConsent(approved)) fail("INELIGIBLE");
    const submitted = await profile(tx, employee, approved.profileRevision);
    if (submitted.state !== "SUBMITTED" || submitted.erasedAt) fail("INELIGIBLE");
    await tx.employeePublicationApproval.updateMany({ where: { employeeId: employee.id, scope: approved.scope, isPublished: true }, data: { isPublished: false } });
    const published = await tx.employeePublicationApproval.update({ where: { id: approved.id }, data: { isPublished: true, publishedAt: new Date() } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "PROFILE_PUBLISHED", ["isPublished"], approved.profileRevision); return published;
  });
}
export async function unpublishEmployeeProfile(input: unknown) {
  return run("employees.directory.publish", async (tx, actor) => {
    const data = parse(approvalActionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const approved = await approval(tx, employee, data.approvalId);
    if (approved.scope === "VERIFICATION" && !hasAdminPermission(actor.role, "employees.verification.publish")) throw new AdminAuthorizationError("FORBIDDEN");
    const result = await tx.employeePublicationApproval.update({ where: { id: approved.id }, data: { isPublished: false } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "PROFILE_UNPUBLISHED", ["isPublished"], approved.profileRevision); return result;
  });
}
export async function withdrawPublicationApproval(input: unknown) {
  return run("employees.revisions.approve", async (tx, actor) => {
    const data = parse(approvalActionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion, true);
    const approved = await approval(tx, employee, data.approvalId);
    if (approved.status === "WITHDRAWN") fail("INELIGIBLE");
    const result = await tx.employeePublicationApproval.update({ where: { id: approved.id }, data: { status: "WITHDRAWN", isPublished: false, withdrawnAt: new Date() } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "APPROVAL_WITHDRAWN", ["status", "isPublished"], approved.profileRevision); return result;
  });
}
export async function withdrawEmployeeConsent(input: unknown) {
  return run("employees.policy.manage", async (tx, actor) => {
    const data = parse(employeeVersionSchema.extend({ consentReference: z.string().trim().min(1).max(200) }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion, true);
    const result = await tx.employeePublicationApproval.updateMany({ where: { employeeId: employee.id, consentReference: data.consentReference, status: { not: "WITHDRAWN" } }, data: { status: "WITHDRAWN", isPublished: false, withdrawnAt: new Date() } });
    if (!result.count) fail("NOT_FOUND");
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "CONSENT_WITHDRAWN", ["publicationApprovals"]); return { affectedScopes: result.count };
  });
}
export async function changeEmployeeStatus(input: unknown) {
  return run("employees.verification.status.manage", async (tx, actor) => {
    const data = parse(employeeVersionSchema.extend({ status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED", "FORMER"]) }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const status = getEmployeeDatabaseStatus(data.status);
    if (employee.employmentStatus === status) fail("INELIGIBLE");
    const reactivationApprovalIds = await suspendPublication(tx, employee);
    const updated = await bump(tx, employee, { employmentStatus: status, statusChangedAt: new Date(), publicationEpoch: { increment: 1 }, reactivationApprovalIds });
    await audit(tx, actor, updated, "STATUS_CHANGED", ["employmentStatus", "publicationApprovals"], undefined, false, getEmployeeBusinessStatus(status)); return updated;
  });
}
export async function resignEmployee(input: unknown) {
  await requireAdminPermission("employees.verification.status.manage");
  // Strictly validate before adding the fixed transition; clients cannot override it.
  const data = parse(employeeVersionSchema, input);
  return changeEmployeeStatus({ ...data, status: "RESIGNED" });
}
export async function rejoinEmployee(input: unknown) {
  return run("employees.verification.status.manage", async (tx, actor) => {
    for (const permission of ["employees.revisions.approve", "employees.directory.publish", "employees.verification.publish"] as const) {
      if (!hasAdminPermission(actor.role, permission)) throw new AdminAuthorizationError("FORBIDDEN");
    }
    const data = parse(employeeVersionSchema.extend({ approvalIds: z.array(employeeIdSchema).min(1).max(2).optional() }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion, true);
    if (employee.employmentStatus === "ACTIVE" && !employee.archivedAt) fail("INELIGIBLE");
    const ids = data.approvalIds ?? employee.reactivationApprovalIds;
    if (!ids.length || new Set(ids).size !== ids.length) fail("APPROVAL_REQUIRED");
    const snapshots: EmployeePublicationApproval[] = [];
    for (const id of ids) {
      const value = await approval(tx, employee, id);
      if (value.status === "WITHDRAWN" || value.withdrawnAt) fail("CONSENT_WITHDRAWN");
      if (value.status !== "APPROVED") fail("APPROVAL_REQUIRED");
      if (!value.consentReference || !value.consentPolicyVersion || !value.consentRecordedAt || value.evidenceErasedAt || value.consentRecordedAt > new Date()) fail("CONSENT_REQUIRED");
      if (value.consentExpiresAt && value.consentExpiresAt <= new Date()) fail("CONSENT_EXPIRED");
      // Withdrawal of the same consent in any epoch/scope remains authoritative.
      if (await tx.employeePublicationApproval.findFirst({ where: { employeeId: employee.id, consentReference: value.consentReference, status: "WITHDRAWN" }, select: { id: true } })) fail("CONSENT_WITHDRAWN");
      const submitted = await profile(tx, employee, value.profileRevision);
      if (submitted.state !== "SUBMITTED" || submitted.erasedAt) fail("APPROVAL_REQUIRED");
      if (value.publishPortrait) fail("PORTRAIT_STORAGE_PENDING");
      if (snapshots.some(other => other.scope === value.scope)) fail("VALIDATION");
      snapshots.push(value);
    }
    const updated = await bump(tx, employee, { employmentStatus: "ACTIVE", archivedAt: null, statusChangedAt: new Date(), publicationEpoch: { increment: 1 }, reactivationApprovalIds: [] });
    for (const value of snapshots) {
      const submitted = await profile(tx, updated, value.profileRevision);
      const created = await tx.employeePublicationApproval.create({ data: {
        employeeId: employee.id, profileRevision: value.profileRevision, employmentEpoch: updated.publicationEpoch, scope: value.scope,
        consentReference: value.consentReference, consentPolicyVersion: value.consentPolicyVersion, consentRecordedAt: value.consentRecordedAt,
        consentExpiresAt: value.consentExpiresAt, publishPortrait: value.publishPortrait, publishPhone: value.publishPhone, publishEmail: value.publishEmail,
      } });
      const self = submitted.submittedBySnapshot === actor.id;
      await tx.employeePublicationApproval.update({ where: { id: created.id }, data: { status: "APPROVED", decidedAt: new Date(), decidedById: actor.id, decidedBySnapshot: actor.id, selfApproved: self, isPublished: true, publishedAt: new Date() } });
      await audit(tx, actor, updated, "REVISION_APPROVED", ["publicationApprovals"], value.profileRevision, self, "REJOIN");
      await audit(tx, actor, updated, "PROFILE_PUBLISHED", ["isPublished"], value.profileRevision, false, "REJOIN");
    }
    await audit(tx, actor, updated, "STATUS_CHANGED", ["employmentStatus", "archivedAt", "publicationApprovals"], undefined, false, "REJOIN");
    return updated;
  });
}
export async function issueVerificationIdentity(input: unknown) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await run("employees.identities.issue", async (tx, actor) => {
        const data = parse(employeeVersionSchema, input);
        const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
        if (employee.employmentStatus !== "ACTIVE") fail("INELIGIBLE");
        if (await tx.employeeVerificationIdentity.findFirst({ where: { employeeId: employee.id, retiredAt: null }, select: { id: true } })) fail("CONFLICT");
        const identity = await tx.employeeVerificationIdentity.create({ data: { employeeId: employee.id, publicKey: generateVerificationKey() } });
        const updated = await bump(tx, employee);
        await audit(tx, actor, updated, "IDENTITY_ISSUED", ["verificationIdentity"]); return identity;
      });
    } catch (error) { if (!(error instanceof KeyCollision)) throw error; }
  }
  fail("CONFLICT");
}
export async function retireVerificationIdentity(input: unknown) {
  return run("employees.identities.retire", async (tx, actor) => {
    const data = parse(employeeVersionSchema.extend({ identityId: employeeIdSchema }), input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion, true);
    const identity = await tx.employeeVerificationIdentity.findFirst({ where: { id: data.identityId, employeeId: employee.id, retiredAt: null } });
    if (!identity) fail("NOT_FOUND");
    await tx.employeePublicationApproval.updateMany({ where: { employeeId: employee.id, scope: "VERIFICATION", status: { not: "WITHDRAWN" } }, data: { status: "WITHDRAWN", isPublished: false, withdrawnAt: new Date() } });
    const retired = await tx.employeeVerificationIdentity.update({ where: { id: identity.id }, data: { retiredAt: new Date() } });
    const updated = await bump(tx, employee);
    await audit(tx, actor, updated, "IDENTITY_RETIRED", ["retiredAt", "publicationApprovals"]); return retired;
  });
}
export async function archiveEmployee(input: unknown) {
  return run("employees.verification.status.manage", async (tx, actor) => {
    const data = parse(employeeVersionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion);
    const reactivationApprovalIds = await suspendPublication(tx, employee);
    const updated = await bump(tx, employee, { archivedAt: new Date(), publicationEpoch: { increment: 1 }, reactivationApprovalIds });
    await audit(tx, actor, updated, "ARCHIVED", ["archivedAt", "publicationApprovals"]); return updated;
  });
}
export async function restoreEmployee(input: unknown) {
  return run("employees.verification.status.manage", async (tx, actor) => {
    const data = parse(employeeVersionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion, true);
    if (!employee.archivedAt) fail("INELIGIBLE");
    const reactivationApprovalIds = await suspendPublication(tx, employee);
    const updated = await bump(tx, employee, { archivedAt: null, employmentStatus: "INACTIVE", statusChangedAt: new Date(), publicationEpoch: { increment: 1 }, reactivationApprovalIds });
    await audit(tx, actor, updated, "RESTORED", ["archivedAt", "employmentStatus"]); return updated;
  });
}
export async function eraseEmployeePersonalData(input: unknown) {
  return run("employees.policy.manage", async (tx, actor) => {
    const data = parse(employeeVersionSchema, input);
    const employee = await lockEmployee(tx, data.employeeId, data.expectedVersion, true);
    const portraits = await tx.employeePublicProfile.count({ where: { employeeId: employee.id, portraitStorageKey: { not: null } } });
    // Do not discard the only asset-deletion references or claim media erasure.
    if (portraits) fail("PORTRAIT_STORAGE_PENDING");
    await withdrawAll(tx, employee.id);
    await tx.employeeVerificationIdentity.updateMany({ where: { employeeId: employee.id, retiredAt: null }, data: { retiredAt: new Date() } });
    const now = new Date();
    const updated = await bump(tx, employee, { archivedAt: employee.archivedAt ?? now, personalDataErasedAt: now, internalName: null, departmentId: null, publicationEpoch: { increment: 1 }, reactivationApprovalIds: [] });
    await tx.employeePublicProfile.updateMany({ where: { employeeId: employee.id }, data: {
      state: "ERASED", erasedAt: now, publicName: null, designation: null, biography: null, experienceSummary: null,
      departmentId: null, departmentName: null, portraitStorageKey: null, portraitStorageVersion: null,
      officialPhone: null, officialEmail: null, displayOrder: 0, isFeatured: false, version: { increment: 1 },
    } });
    await tx.employeePublicationApproval.updateMany({ where: { employeeId: employee.id }, data: {
      consentReference: null, consentPolicyVersion: null, consentRecordedAt: null, consentExpiresAt: null, evidenceErasedAt: now,
    } });
    await audit(tx, actor, updated, "PERSONAL_DATA_ERASED", ["personalData", "publicationApprovals", "verificationIdentity"]);
    return { employeeCode: updated.employeeCode, erasedAt: now, mediaErasure: "NO_REFERENCED_ASSETS" as const };
  });
}
