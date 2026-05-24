import { z } from "zod";
import {
  siteSettingFields,
  type PublicSiteSettings,
  type SiteSettingKey,
} from "../../../../lib/siteSettingsConfig";
export type { SiteSettingsActionState } from "./formOptions";

function isValidUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidImageUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/")) return true;
  return isValidUrl(value);
}

function isValidColor(value: string) {
  if (!value) return true;
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

const settingShape = Object.fromEntries(
  siteSettingFields.map((field) => [
    field.key,
    z.string().trim().max(field.maxLength, `${field.label} is too long.`),
  ]),
) as Record<SiteSettingKey, z.ZodString>;

export const siteSettingsSchema = z.object(settingShape).superRefine((value, context) => {
  for (const field of siteSettingFields) {
    const settingValue = value[field.key];

    if (field.input === "email" && settingValue && !z.string().email().safeParse(settingValue).success) {
      context.addIssue({
        code: "custom",
        message: "Use a valid email address.",
        path: [field.key],
      });
    }

    if (field.type === "URL" && !isValidUrl(settingValue)) {
      context.addIssue({
        code: "custom",
        message: "Use a valid http or https URL.",
        path: [field.key],
      });
    }

    if (field.type === "IMAGE_URL" && !isValidImageUrl(settingValue)) {
      context.addIssue({
        code: "custom",
        message: "Use an uploaded image path or a valid http/https URL.",
        path: [field.key],
      });
    }

    if (field.input === "color" && !isValidColor(settingValue)) {
      context.addIssue({
        code: "custom",
        message: "Use a valid hex color such as #ad1b28.",
        path: [field.key],
      });
    }
  }

  if (!value.siteName) {
    context.addIssue({
      code: "custom",
      message: "Site name is required.",
      path: ["siteName"],
    });
  }
});

export function readSiteSettingsForm(formData: FormData): PublicSiteSettings {
  return Object.fromEntries(
    siteSettingFields.map((field) => [field.key, String(formData.get(field.key) ?? "")]),
  ) as PublicSiteSettings;
}
