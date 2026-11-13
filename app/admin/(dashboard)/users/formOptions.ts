import { adminRoles, type AdminRole } from "../../../../lib/adminPermissions";

export const adminUserRoleOptions = adminRoles;

export type AdminUserActionState = {
  errors?: Partial<Record<"email" | "form" | "id" | "isActive" | "name" | "password" | "role", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialAdminUserActionState: AdminUserActionState = {
  message: "",
  status: "idle",
};

export function formatAdminRole(role: AdminRole) {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
