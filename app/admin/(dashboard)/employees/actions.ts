"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission, AdminAuthorizationError } from "../../../../lib/adminAuthorization";
import { EmployeeDomainError, createEmployee, createDraftRevision, saveEmployeeDraft, submitEmployeeRevision, requestPublicationApproval, decidePublicationApproval, publishEmployeeProfile, unpublishEmployeeProfile, changeEmployeeStatus, resignEmployee, rejoinEmployee, withdrawEmployeeConsent } from "../../../../lib/employees/services";
import type { EmployeeActionState } from "./formState";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const number = (form: FormData, key: string) => Number(text(form, key));
const utc = (form: FormData, key: string) => text(form, key) ? `${text(form, key)}Z` : "";
const messages: Record<string, string> = {
  VALIDATION: "Please check the form fields and try again.", CONFLICT: "This record changed. Reload before trying again; your changes were not retried.",
  INELIGIBLE: "This operation is not available in the record's current state. Reload and review its status.",
  NOT_FOUND: "The requested record was not found.", UNAVAILABLE: "Employee management is temporarily unavailable.",
  FORBIDDEN: "You do not have permission to perform this operation.", UNAUTHENTICATED: "Sign in again to continue.",
  PORTRAIT_STORAGE_PENDING: "Employee portraits are not available in this release.",
  APPROVAL_REQUIRED: "A previously approved submitted revision is required before rejoining.",
  CONSENT_REQUIRED: "Current consent evidence is required.", CONSENT_EXPIRED: "Consent has expired. Obtain current consent before proceeding.",
  CONSENT_WITHDRAWN: "This consent was withdrawn. Obtain a new consent reference and approval.",
};
function failure(error: unknown): EmployeeActionState {
  const code = error instanceof EmployeeDomainError || error instanceof AdminAuthorizationError ? error.code : "UNAVAILABLE";
  return { status: "error", code, message: messages[code] ?? messages.UNAVAILABLE };
}
function refresh() {
  revalidatePath("/admin/employees");
  revalidatePath("/admin/employees/[employeeCode]", "page");
}
export async function createEmployeeAction(_previous: EmployeeActionState, form: FormData): Promise<EmployeeActionState> {
  await requireAdminPermission("employees.draft.create");
  try {
    const employee = await createEmployee({ internalName: text(form, "internalName") || null, departmentId: text(form, "departmentId") || null });
    refresh();
    return { status: "success", message: "Employee created as inactive with an unpublished draft.", employeeCode: employee.employeeCode };
  } catch (error) { return failure(error); }
}

export async function employeeAction(_previous: EmployeeActionState, form: FormData): Promise<EmployeeActionState> {
  await requireAdminPermission("employees.records.read");
  try {
    const operation = text(form, "operation");
    const base = { employeeId: text(form, "employeeId"), expectedVersion: number(form, "expectedVersion") };
    const revision = number(form, "revision"), approvalId = text(form, "approvalId");
    if (["activate", "resign", "rejoin", "publish", "unpublish", "withdrawConsent", "approve", "reject"].includes(operation) && form.get("confirmed") !== "on") throw new EmployeeDomainError("VALIDATION");
    switch (operation) {
      case "newDraft": await createDraftRevision({ ...base, fields: {} }); break;
      case "saveDraft": {
        const department = text(form, "departmentId");
        await saveEmployeeDraft({ ...base, revision, expectedProfileVersion: number(form, "expectedProfileVersion"), fields: {
          publicName: text(form, "publicName") || null, designation: text(form, "designation") || null,
          biography: text(form, "biography") || null, experienceSummary: text(form, "experienceSummary") || null,
          officialPhone: text(form, "officialPhone") || null, officialEmail: text(form, "officialEmail") || null,
          displayOrder: number(form, "displayOrder"), isFeatured: form.get("isFeatured") === "on",
          ...(department === "__unchanged__" ? {} : { departmentId: department || null }),
        } }); break;
      }
      case "submit": await submitEmployeeRevision({ ...base, revision }); break;
      case "requestApproval": await requestPublicationApproval({ ...base, revision,
        scope: text(form, "scope"), consentReference: text(form, "consentReference"), consentPolicyVersion: text(form, "consentPolicyVersion"),
        consentRecordedAt: utc(form, "consentRecordedAt"), consentExpiresAt: utc(form, "consentExpiresAt") || null,
        publishPhone: form.get("publishPhone") === "on", publishEmail: form.get("publishEmail") === "on", publishPortrait: false,
      }); break;
      case "approve": case "reject": await decidePublicationApproval({ ...base, approvalId, decision: operation === "approve" ? "APPROVED" : "REJECTED" }); break;
      case "publish": await publishEmployeeProfile({ ...base, approvalId }); break;
      case "unpublish": await unpublishEmployeeProfile({ ...base, approvalId }); break;
      case "activate": await changeEmployeeStatus({ ...base, status: "ACTIVE" }); break;
      case "resign": await resignEmployee(base); break;
      case "rejoin": {
        const approvalIds = form.getAll("approvalIds").map(String).filter(Boolean);
        await rejoinEmployee({ ...base, ...(approvalIds.length ? { approvalIds } : {}) }); break;
      }
      case "withdrawConsent": await withdrawEmployeeConsent({ ...base, consentReference: text(form, "consentReference") }); break;
      default: throw new EmployeeDomainError("VALIDATION");
    }
    refresh();
    return { status: "success", message: "Operation completed. The record has been refreshed." };
  } catch (error) { return failure(error); }
}
