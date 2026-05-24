import { AdminRole } from "../../../../lib/generated/prisma/enums";

export const adminUserRoleOptions = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR] as const;

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
