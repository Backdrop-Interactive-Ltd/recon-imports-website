import { z } from "zod";
import { VehicleCategoryType } from "../../../../lib/generated/prisma/enums";

export type CategoryActionState = {
  errors?: Partial<Record<"form" | "id" | "imageUrl" | "isActive" | "name" | "slug" | "sortOrder" | "type", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialCategoryActionState: CategoryActionState = {
  message: "",
  status: "idle",
};

export const categoryTypeOptions = Object.values(VehicleCategoryType);

export function slugifyCategory(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isValidImageUrl(value: string) {
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

export const categoryIdSchema = z.string().trim().min(1, "Category id is required.");

export const categoryFormSchema = z
  .object({
    imageUrl: z.string().trim().max(500, "Image URL is too long.").optional(),
    isActive: z.boolean(),
    name: z.string().trim().min(1, "Category name is required.").max(80, "Category name is too long."),
    slug: z.string().trim().max(100, "Slug is too long.").optional(),
    sortOrder: z.coerce
      .number({ error: "Sort order must be a number." })
      .int("Sort order must be a whole number.")
      .min(0, "Sort order cannot be negative.")
      .max(9999, "Sort order is too high."),
    type: z.enum(categoryTypeOptions, { error: "Choose a valid category type." }),
  })
  .superRefine((value, context) => {
    const slug = slugifyCategory(value.slug || value.name);

    if (!slug) {
      context.addIssue({
        code: "custom",
        message: "Slug is required.",
        path: ["slug"],
      });
    }

    if (value.imageUrl && !isValidImageUrl(value.imageUrl)) {
      context.addIssue({
        code: "custom",
        message: "Use a full http/https URL or a site-relative path starting with /.",
        path: ["imageUrl"],
      });
    }
  })
  .transform((value) => ({
    imageUrl: value.imageUrl || null,
    isActive: value.isActive,
    name: value.name,
    slug: slugifyCategory(value.slug || value.name),
    sortOrder: value.sortOrder,
    type: value.type,
  }));
