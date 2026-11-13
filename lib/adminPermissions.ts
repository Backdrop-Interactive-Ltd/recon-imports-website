// Shared policy only: safe for navigation. Identity resolution stays server-side.
export const adminRoles = ["SUPER_ADMIN", "ADMIN", "EDITOR"] as const;
export type AdminRole = (typeof adminRoles)[number];

const existingPermissions = [
  "dashboard.access", "inventory.manage", "brands.manage", "categories.manage",
  "homepage.manage", "leads.manage", "auction.manage", "newsletter.manage",
  "media.manage", "settings.manage", "uploads.create",
] as const;

const employeeDraftPermissions = [
  "employees.records.read", "employees.draft.create", "employees.draft.edit",
  "employees.revisions.submit",
] as const;

export const adminPermissions = [
  ...existingPermissions, "adminUsers.manage", "employees.approved.read",
  ...employeeDraftPermissions, "employees.restricted.read", "employees.revisions.approve",
  "employees.directory.publish", "employees.verification.publish",
  "employees.verification.status.manage", "employees.identities.issue",
  "employees.identities.retire", "employees.qr.export", "employees.policy.manage",
] as const;
export type AdminPermission = (typeof adminPermissions)[number];

const grants: Record<AdminRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: adminPermissions,
  ADMIN: [...existingPermissions, "employees.approved.read", ...employeeDraftPermissions],
  EDITOR: [...existingPermissions, "employees.approved.read"],
};

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && adminRoles.some((value) => value === role);
}

export function hasAdminPermission(role: unknown, permission: AdminPermission): boolean {
  return isAdminRole(role) && grants[role].includes(permission);
}
