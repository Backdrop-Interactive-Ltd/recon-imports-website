import { z } from "zod";
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

export const adminUserIdSchema = z.string().trim().min(1, "Admin user id is required.");

const baseAdminUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long.").transform((email) => email.toLowerCase()),
  isActive: z.boolean(),
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  role: z.enum(adminUserRoleOptions, {
    error: "Choose a valid admin role.",
  }),
});

export const createAdminUserSchema = baseAdminUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters.").max(120, "Password is too long."),
});

export const updateAdminUserSchema = baseAdminUserSchema.extend({
  password: z
    .string()
    .max(120, "Password is too long.")
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => !value || value.length >= 8, "Password must be at least 8 characters."),
});

export function formatAdminRole(role: AdminRole) {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
