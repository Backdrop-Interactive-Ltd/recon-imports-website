"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { Prisma } from "../../../../lib/generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import {
  adminUserIdSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  type AdminUserActionState,
} from "./validation";

type AdminSessionUser = {
  id?: string;
  role?: string;
};

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
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const user = session.user as AdminSessionUser;

  if (!user.id) {
    redirect("/admin/login");
  }

  return {
    id: user.id,
  };
}

async function isDuplicateEmail(email: string, currentUserId?: string) {
  const existingUser = await prisma.adminUser.findUnique({
    select: { id: true },
    where: { email },
  });

  return Boolean(existingUser && existingUser.id !== currentUserId);
}

function revalidateAdminUserViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function createAdminUserAction(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  await requireAdminSession();

  const parsed = createAdminUserSchema.safeParse(readAdminUserForm(formData));

  if (!parsed.success) {
    return createFieldErrorState(parsed);
  }

  if (await isDuplicateEmail(parsed.data.email)) {
    return {
      errors: { email: "This email is already used by another admin user." },
      message: "Admin email must be unique.",
      status: "error",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.adminUser.create({
      data: {
        email: parsed.data.email,
        isActive: parsed.data.isActive,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { email: "This email is already used by another admin user." },
        message: "Admin email must be unique.",
        status: "error",
      };
    }

    throw error;
  }

  revalidateAdminUserViews();

  return {
    message: "Admin user created successfully.",
    status: "success",
  };
}

export async function updateAdminUserAction(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const currentAdmin = await requireAdminSession();
  const id = adminUserIdSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Admin user id is missing.",
      status: "error",
    };
  }

  const parsed = updateAdminUserSchema.safeParse(readAdminUserForm(formData));

  if (!parsed.success) {
    return updateFieldErrorState(parsed);
  }

  const adminUser = await prisma.adminUser.findUnique({
    select: { id: true, isActive: true },
    where: { id: id.data },
  });

  if (!adminUser) {
    return {
      errors: { form: "Admin user was not found." },
      message: "Admin user was not found.",
      status: "error",
    };
  }

  if (currentAdmin.id === id.data && !parsed.data.isActive) {
    return {
      errors: { isActive: "You cannot deactivate your own admin account." },
      message: "You cannot deactivate the currently logged-in admin.",
      status: "error",
    };
  }

  if (await isDuplicateEmail(parsed.data.email, id.data)) {
    return {
      errors: { email: "This email is already used by another admin user." },
      message: "Admin email must be unique.",
      status: "error",
    };
  }

  try {
    await prisma.adminUser.update({
      data: {
        email: parsed.data.email,
        isActive: parsed.data.isActive,
        name: parsed.data.name,
        passwordHash: parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : undefined,
        role: parsed.data.role,
      },
      where: { id: id.data },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { email: "This email is already used by another admin user." },
        message: "Admin email must be unique.",
        status: "error",
      };
    }

    throw error;
  }

  revalidateAdminUserViews();

  return {
    message: parsed.data.password ? "Admin user and password updated successfully." : "Admin user updated successfully.",
    status: "success",
  };
}

export async function setAdminUserActiveAction(adminUserId: string, isActive: boolean): Promise<AdminUserActionState> {
  const currentAdmin = await requireAdminSession();
  const id = adminUserIdSchema.safeParse(adminUserId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Admin user id is missing.",
      status: "error",
    };
  }

  if (currentAdmin.id === id.data && !isActive) {
    return {
      errors: { form: "You cannot deactivate your own admin account." },
      message: "You cannot deactivate the currently logged-in admin.",
      status: "error",
    };
  }

  const adminUser = await prisma.adminUser.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!adminUser) {
    return {
      errors: { form: "Admin user was not found." },
      message: "Admin user was not found.",
      status: "error",
    };
  }

  await prisma.adminUser.update({
    data: { isActive },
    where: { id: id.data },
  });

  revalidateAdminUserViews();

  return {
    message: isActive ? "Admin user reactivated." : "Admin user deactivated.",
    status: "success",
  };
}

export async function deleteAdminUserAction(adminUserId: string): Promise<AdminUserActionState> {
  const currentAdmin = await requireAdminSession();
  const id = adminUserIdSchema.safeParse(adminUserId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Admin user id is missing.",
      status: "error",
    };
  }

  if (currentAdmin.id === id.data) {
    return {
      errors: { form: "You cannot delete your own admin account." },
      message: "You cannot delete the currently logged-in admin.",
      status: "error",
    };
  }

  const adminUser = await prisma.adminUser.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!adminUser) {
    return {
      errors: { form: "Admin user was not found." },
      message: "Admin user was not found.",
      status: "error",
    };
  }

  await prisma.adminUser.delete({
    where: { id: id.data },
  });

  revalidateAdminUserViews();

  return {
    message: "Admin user deleted successfully.",
    status: "success",
  };
}
