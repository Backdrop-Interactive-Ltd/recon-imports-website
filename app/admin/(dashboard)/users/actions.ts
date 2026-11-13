"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "../../../../lib/adminAuthorization";
import { Prisma } from "../../../../lib/generated/prisma/client";
import { AdminAccountSafetyError, withAdminAccountMutation } from "../../../../lib/adminAccountSafety";
import { AdminAuthorizationError } from "../../../../lib/adminAuthorization";
import {
  adminUserIdSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  type AdminUserActionState,
} from "./validation";


function createFieldErrorState(error: ReturnType<typeof createAdminUserSchema.safeParse>): AdminUserActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      email: flattened.email?.[0],
      isActive: flattened.isActive?.[0],
      name: flattened.name?.[0],
      password: flattened.password?.[0],
      role: flattened.role?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function updateFieldErrorState(error: ReturnType<typeof updateAdminUserSchema.safeParse>): AdminUserActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      email: flattened.email?.[0],
      isActive: flattened.isActive?.[0],
      name: flattened.name?.[0],
      password: flattened.password?.[0],
      role: flattened.role?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readAdminUserForm(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    isActive: formData.get("isActive") === "on",
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
  };
}

async function requireAdminSession() {
  return requireAdminPermission("adminUsers.manage");
}


function failure(message: string): AdminUserActionState {
  return { status: "error", message, errors: { form: message } };
}

async function mutateAdminUsers(
  actorId: string,
  operation: Parameters<typeof withAdminAccountMutation<AdminUserActionState>>[1],
): Promise<AdminUserActionState> {
  try {
    const result = await withAdminAccountMutation(actorId, operation);
    if (result.status === "success") {
      revalidatePath("/admin");
      revalidatePath("/admin/users");
    }
    return result;
  } catch (error) {
    if (error instanceof AdminAccountSafetyError || error instanceof AdminAuthorizationError) return failure(error.message);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { status: "error", message: "Admin email must be unique.", errors: { email: "This email is already used by another admin user." } };
      if (error.code === "P2025") return failure("Admin user was not found.");
    }
    return failure("Admin account update failed. Please try again.");
  }
}

export async function createAdminUserAction(
  _previousState: AdminUserActionState, formData: FormData,
): Promise<AdminUserActionState> {
  const actor = await requireAdminSession();
  const parsed = createAdminUserSchema.safeParse(readAdminUserForm(formData));
  if (!parsed.success) return createFieldErrorState(parsed);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  return mutateAdminUsers(actor.id, async (transaction) => {
    const { password: _password, ...data } = parsed.data;
    await transaction.adminUser.create({ data: { ...data, passwordHash } });
    return { message: "Admin user created successfully.", status: "success" };
  });
}

export async function updateAdminUserAction(
  _previousState: AdminUserActionState, formData: FormData,
): Promise<AdminUserActionState> {
  const actor = await requireAdminSession();
  const id = adminUserIdSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("Admin user id is missing.");
  const parsed = updateAdminUserSchema.safeParse(readAdminUserForm(formData));
  if (!parsed.success) return updateFieldErrorState(parsed);
  if (actor.id === id.data && !parsed.data.isActive) {
    return { status: "error", message: "You cannot deactivate the currently logged-in admin.", errors: { isActive: "You cannot deactivate your own admin account." } };
  }
  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : undefined;
  return mutateAdminUsers(actor.id, async (transaction) => {
    const { password: _password, ...data } = parsed.data;
    await transaction.adminUser.update({ where: { id: id.data }, data: { ...data, passwordHash } });
    return { status: "success", message: passwordHash ? "Admin user and password updated successfully." : "Admin user updated successfully." };
  });
}

export async function setAdminUserActiveAction(adminUserId: string, isActive: boolean): Promise<AdminUserActionState> {
  const actor = await requireAdminSession();
  const id = adminUserIdSchema.safeParse(adminUserId);
  if (!id.success) return failure("Admin user id is missing.");
  if (typeof isActive !== "boolean") return failure("Choose a valid account status.");
  if (actor.id === id.data && !isActive) return failure("You cannot deactivate the currently logged-in admin.");
  return mutateAdminUsers(actor.id, async (transaction) => {
    await transaction.adminUser.update({ where: { id: id.data }, data: { isActive } });
    return { status: "success", message: isActive ? "Admin user reactivated." : "Admin user deactivated." };
  });
}

export async function deleteAdminUserAction(adminUserId: string): Promise<AdminUserActionState> {
  const actor = await requireAdminSession();
  const id = adminUserIdSchema.safeParse(adminUserId);
  if (!id.success) return failure("Admin user id is missing.");
  if (actor.id === id.data) return failure("You cannot delete the currently logged-in admin.");
  return mutateAdminUsers(actor.id, async (transaction) => {
    await transaction.adminUser.delete({ where: { id: id.data } });
    return { status: "success", message: "Admin user deleted successfully." };
  });
}
