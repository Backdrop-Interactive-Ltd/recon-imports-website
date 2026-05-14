"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { heroSlideFormSchema, heroSlideIdSchema, type HeroSlideActionState } from "./validation";

function fieldErrorState(error: ReturnType<typeof heroSlideFormSchema.safeParse>): HeroSlideActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      ctaLink: flattened.ctaLink?.[0],
      ctaText: flattened.ctaText?.[0],
      imageUrl: flattened.imageUrl?.[0],
      isActive: flattened.isActive?.[0],
      sortOrder: flattened.sortOrder?.[0],
      subtitle: flattened.subtitle?.[0],
      title: flattened.title?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readHeroSlideForm(formData: FormData) {
  return {
    ctaLink: String(formData.get("ctaLink") ?? ""),
    ctaText: String(formData.get("ctaText") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    isActive: formData.get("isActive") === "on",
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    subtitle: String(formData.get("subtitle") ?? ""),
    title: String(formData.get("title") ?? ""),
  };
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateHeroViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/homepage");
}

export async function createHeroSlideAction(
  _previousState: HeroSlideActionState,
  formData: FormData,
): Promise<HeroSlideActionState> {
  await requireAdminSession();

  const parsed = heroSlideFormSchema.safeParse(readHeroSlideForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  await prisma.heroSlide.create({
    data: parsed.data,
  });

  revalidateHeroViews();

  return {
    message: "Hero slide created successfully.",
    status: "success",
  };
}

export async function updateHeroSlideAction(
  _previousState: HeroSlideActionState,
  formData: FormData,
): Promise<HeroSlideActionState> {
  await requireAdminSession();

  const id = heroSlideIdSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Hero slide id is missing.",
      status: "error",
    };
  }

  const parsed = heroSlideFormSchema.safeParse(readHeroSlideForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  const slide = await prisma.heroSlide.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!slide) {
    return {
      errors: { form: "Hero slide was not found." },
      message: "Hero slide was not found.",
      status: "error",
    };
  }

  await prisma.heroSlide.update({
    data: parsed.data,
    where: { id: id.data },
  });

  revalidateHeroViews();

  return {
    message: "Hero slide updated successfully.",
    status: "success",
  };
}

export async function setHeroSlideActiveAction(heroSlideId: string, isActive: boolean): Promise<HeroSlideActionState> {
  await requireAdminSession();

  const id = heroSlideIdSchema.safeParse(heroSlideId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Hero slide id is missing.",
      status: "error",
    };
  }

  const slide = await prisma.heroSlide.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!slide) {
    return {
      errors: { form: "Hero slide was not found." },
      message: "Hero slide was not found.",
      status: "error",
    };
  }

  await prisma.heroSlide.update({
    data: { isActive },
    where: { id: id.data },
  });

  revalidateHeroViews();

  return {
    message: isActive ? "Hero slide activated." : "Hero slide deactivated.",
    status: "success",
  };
}

export async function deleteHeroSlideAction(heroSlideId: string): Promise<HeroSlideActionState> {
  await requireAdminSession();

  const id = heroSlideIdSchema.safeParse(heroSlideId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Hero slide id is missing.",
      status: "error",
    };
  }

  const slide = await prisma.heroSlide.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!slide) {
    return {
      errors: { form: "Hero slide was not found." },
      message: "Hero slide was not found.",
      status: "error",
    };
  }

  await prisma.heroSlide.delete({
    where: { id: id.data },
  });

  revalidateHeroViews();

  return {
    message: "Hero slide deleted successfully.",
    status: "success",
  };
}
