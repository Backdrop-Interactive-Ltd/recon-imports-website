"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SiteSettingType } from "../../../../lib/generated/prisma/enums";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { siteSettingFields } from "../../../../lib/siteSettingsConfig";
import {
  readSiteSettingsForm,
  siteSettingsSchema,
  type SiteSettingsActionState,
} from "./validation";

function fieldErrorState(error: ReturnType<typeof siteSettingsSchema.safeParse>): SiteSettingsActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: Object.fromEntries(
      Object.entries(flattened).map(([key, value]) => [key, value?.[0]]),
    ),
    message: "Please fix the highlighted settings.",
    status: "error",
  };
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateSiteSettingsViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/site-settings");
  revalidatePath("/", "layout");
}

export async function updateSiteSettingsAction(
  _previousState: SiteSettingsActionState,
  formData: FormData,
): Promise<SiteSettingsActionState> {
  await requireAdminSession();

  const parsed = siteSettingsSchema.safeParse(readSiteSettingsForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  await prisma.$transaction(
    siteSettingFields.map((field) =>
      prisma.siteSetting.upsert({
        create: {
          key: field.key,
          type: field.type as SiteSettingType,
          value: parsed.data[field.key],
        },
        update: {
          type: field.type as SiteSettingType,
          value: parsed.data[field.key],
        },
        where: {
          key: field.key,
        },
      }),
    ),
  );

  revalidateSiteSettingsViews();

  return {
    message: "Site settings updated successfully.",
    status: "success",
  };
}
