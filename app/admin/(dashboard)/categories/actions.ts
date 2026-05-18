"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { categoryFormSchema, categoryIdSchema, type CategoryActionState } from "./validation";

function fieldErrorState(error: ReturnType<typeof categoryFormSchema.safeParse>): CategoryActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      description: flattened.description?.[0],
      iconKey: flattened.iconKey?.[0],
      imageAlt: flattened.imageAlt?.[0],
      imageUrl: flattened.imageUrl?.[0],
      isActive: flattened.isActive?.[0],
      name: flattened.name?.[0],
      routePath: flattened.routePath?.[0],
      showOnHomepage: flattened.showOnHomepage?.[0],
      slug: flattened.slug?.[0],
      sortOrder: flattened.sortOrder?.[0],
      type: flattened.type?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readCategoryForm(formData: FormData) {
  return {
    description: String(formData.get("description") ?? ""),
    iconKey: String(formData.get("iconKey") ?? ""),
    imageAlt: String(formData.get("imageAlt") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    isActive: formData.get("isActive") === "on",
    name: String(formData.get("name") ?? ""),
    routePath: String(formData.get("routePath") ?? ""),
    showOnHomepage: formData.get("showOnHomepage") === "on",
    slug: String(formData.get("slug") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    type: String(formData.get("type") ?? ""),
  };
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

async function isDuplicateSlug(slug: string, currentCategoryId?: string) {
  const existingCategory = await prisma.vehicleCategory.findUnique({
    select: { id: true },
    where: { slug },
  });

  return Boolean(existingCategory && existingCategory.id !== currentCategoryId);
}

function revalidateCategoryViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function createCategoryAction(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdminSession();

  const parsed = categoryFormSchema.safeParse(readCategoryForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  if (await isDuplicateSlug(parsed.data.slug)) {
    return {
      errors: { slug: "This slug is already used by another category." },
      message: "Category slug must be unique.",
      status: "error",
    };
  }

  await prisma.vehicleCategory.create({
    data: parsed.data,
  });

  revalidateCategoryViews();

  return {
    message: "Category created successfully.",
    status: "success",
  };
}

export async function updateCategoryAction(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdminSession();

  const id = categoryIdSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Category id is missing.",
      status: "error",
    };
  }

  const parsed = categoryFormSchema.safeParse(readCategoryForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  const category = await prisma.vehicleCategory.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!category) {
    return {
      errors: { form: "Category was not found." },
      message: "Category was not found.",
      status: "error",
    };
  }

  if (await isDuplicateSlug(parsed.data.slug, id.data)) {
    return {
      errors: { slug: "This slug is already used by another category." },
      message: "Category slug must be unique.",
      status: "error",
    };
  }

  await prisma.vehicleCategory.update({
    data: parsed.data,
    where: { id: id.data },
  });

  revalidateCategoryViews();

  return {
    message: "Category updated successfully.",
    status: "success",
  };
}

export async function setCategoryActiveAction(categoryId: string, isActive: boolean): Promise<CategoryActionState> {
  await requireAdminSession();

  const id = categoryIdSchema.safeParse(categoryId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Category id is missing.",
      status: "error",
    };
  }

  const category = await prisma.vehicleCategory.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!category) {
    return {
      errors: { form: "Category was not found." },
      message: "Category was not found.",
      status: "error",
    };
  }

  await prisma.vehicleCategory.update({
    data: { isActive },
    where: { id: id.data },
  });

  revalidateCategoryViews();

  return {
    message: isActive ? "Category activated." : "Category deactivated.",
    status: "success",
  };
}

export async function deleteCategoryAction(categoryId: string): Promise<CategoryActionState> {
  await requireAdminSession();

  const id = categoryIdSchema.safeParse(categoryId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Category id is missing.",
      status: "error",
    };
  }

  const category = await prisma.vehicleCategory.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!category) {
    return {
      errors: { form: "Category was not found." },
      message: "Category was not found.",
      status: "error",
    };
  }

  await prisma.vehicleCategory.delete({
    where: { id: id.data },
  });

  revalidateCategoryViews();

  return {
    message: "Category deleted successfully.",
    status: "success",
  };
}
