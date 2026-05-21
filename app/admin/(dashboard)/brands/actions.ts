"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { brandFormSchema, brandIdSchema, type BrandActionState } from "./validation";

function fieldErrorState(error: ReturnType<typeof brandFormSchema.safeParse>): BrandActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      isActive: flattened.isActive?.[0],
      logoUrl: flattened.logoUrl?.[0],
      name: flattened.name?.[0],
      slug: flattened.slug?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readBrandForm(formData: FormData) {
  return {
    isActive: formData.get("isActive") === "on",
    logoUrl: String(formData.get("logoUrl") ?? ""),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  };
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

async function isDuplicateSlug(slug: string, currentBrandId?: string) {
  const existingBrand = await prisma.brand.findUnique({
    select: { id: true },
    where: { slug },
  });

  return Boolean(existingBrand && existingBrand.id !== currentBrandId);
}

function revalidateBrandViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/brands");
  revalidatePath("/");
  revalidatePath("/brand-new");
  revalidatePath("/pre-owned");
  revalidatePath("/pre-order");
  revalidatePath("/reconditioned");
  revalidatePath("/[brand]", "page");
  revalidatePath("/sitemap.xml");
}

export async function createBrandAction(_previousState: BrandActionState, formData: FormData): Promise<BrandActionState> {
  await requireAdminSession();

  const parsed = brandFormSchema.safeParse(readBrandForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  if (await isDuplicateSlug(parsed.data.slug)) {
    return {
      errors: { slug: "This slug is already used by another brand." },
      message: "Brand slug must be unique.",
      status: "error",
    };
  }

  await prisma.brand.create({
    data: parsed.data,
  });

  revalidateBrandViews();

  return {
    message: "Brand created successfully.",
    status: "success",
  };
}

export async function updateBrandAction(_previousState: BrandActionState, formData: FormData): Promise<BrandActionState> {
  await requireAdminSession();

  const id = brandIdSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Brand id is missing.",
      status: "error",
    };
  }

  const parsed = brandFormSchema.safeParse(readBrandForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  const brand = await prisma.brand.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!brand) {
    return {
      errors: { form: "Brand was not found." },
      message: "Brand was not found.",
      status: "error",
    };
  }

  if (await isDuplicateSlug(parsed.data.slug, id.data)) {
    return {
      errors: { slug: "This slug is already used by another brand." },
      message: "Brand slug must be unique.",
      status: "error",
    };
  }

  await prisma.brand.update({
    data: parsed.data,
    where: { id: id.data },
  });

  revalidateBrandViews();

  return {
    message: "Brand updated successfully.",
    status: "success",
  };
}

export async function setBrandActiveAction(brandId: string, isActive: boolean): Promise<BrandActionState> {
  await requireAdminSession();

  const id = brandIdSchema.safeParse(brandId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Brand id is missing.",
      status: "error",
    };
  }

  const brand = await prisma.brand.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!brand) {
    return {
      errors: { form: "Brand was not found." },
      message: "Brand was not found.",
      status: "error",
    };
  }

  await prisma.brand.update({
    data: { isActive },
    where: { id: id.data },
  });

  revalidateBrandViews();

  return {
    message: isActive ? "Brand activated." : "Brand deactivated.",
    status: "success",
  };
}

export async function deleteBrandAction(brandId: string): Promise<BrandActionState> {
  await requireAdminSession();

  const id = brandIdSchema.safeParse(brandId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Brand id is missing.",
      status: "error",
    };
  }

  const brand = await prisma.brand.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!brand) {
    return {
      errors: { form: "Brand was not found." },
      message: "Brand was not found.",
      status: "error",
    };
  }

  // A brand linked to cars is deactivated instead of deleted to protect inventory history.
  const carsUsingBrand = await prisma.car.count({
    where: { brandId: id.data },
  });

  if (carsUsingBrand > 0) {
    await prisma.brand.update({
      data: { isActive: false },
      where: { id: id.data },
    });

    revalidateBrandViews();

    return {
      message: "Brand is used by cars, so it was safely deactivated instead of deleted.",
      status: "success",
    };
  }

  await prisma.brand.delete({
    where: { id: id.data },
  });

  revalidateBrandViews();

  return {
    message: "Brand deleted successfully.",
    status: "success",
  };
}
