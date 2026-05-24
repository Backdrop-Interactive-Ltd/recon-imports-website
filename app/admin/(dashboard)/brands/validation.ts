import { z } from "zod";
import { slugifyBrand } from "./formOptions";
export type { BrandActionState } from "./formOptions";

function isValidLogoUrl(value: string) {
  if (!value) {
    return true;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const brandIdSchema = z.string().trim().min(1, "Brand id is required.");

export const brandFormSchema = z
  .object({
    isActive: z.boolean(),
    logoUrl: z.string().trim().max(500, "Logo URL is too long.").optional(),
    name: z.string().trim().min(1, "Brand name is required.").max(80, "Brand name is too long."),
    slug: z.string().trim().max(100, "Slug is too long.").optional(),
  })
  .superRefine((value, context) => {
    const slug = slugifyBrand(value.slug || value.name);

    if (!slug) {
      context.addIssue({
        code: "custom",
        message: "Slug is required.",
        path: ["slug"],
      });
    }

    if (value.logoUrl && !isValidLogoUrl(value.logoUrl)) {
      context.addIssue({
        code: "custom",
        message: "Use a full http/https URL or a site-relative path starting with /.",
        path: ["logoUrl"],
      });
    }
  })
  .transform((value) => ({
    isActive: value.isActive,
    logoUrl: value.logoUrl || null,
    name: value.name,
    slug: slugifyBrand(value.slug || value.name),
  }));
