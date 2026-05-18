import { z } from "zod";
import { VehicleCategoryType } from "../../../../lib/generated/prisma/enums";

export type CategoryActionState = {
  errors?: Partial<
    Record<
      | "description"
      | "form"
      | "iconKey"
      | "id"
      | "imageAlt"
      | "imageUrl"
      | "isActive"
      | "name"
      | "routePath"
      | "showOnHomepage"
      | "slug"
      | "sortOrder"
      | "type",
      string
    >
  >;
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

function normalizeRoutePath(value: string, slug: string) {
  const routePath = value.trim();

  if (!routePath) {
    return `/${slug}`;
  }

  return routePath;
}

function isValidRoutePath(value: string) {
  if (!value) return true;
  if (value.startsWith("/")) return true;

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
    description: z.string().trim().max(260, "Description is too long.").optional(),
    iconKey: z.string().trim().max(60, "Icon key is too long.").optional(),
    imageAlt: z.string().trim().max(160, "Image alt text is too long.").optional(),
    imageUrl: z.string().trim().max(500, "Image URL is too long.").optional(),
    isActive: z.boolean(),
    name: z.string().trim().min(1, "Category name is required.").max(80, "Category name is too long."),
    routePath: z.string().trim().max(500, "Route path is too long.").optional(),
    showOnHomepage: z.boolean(),
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

    if (value.routePath && !isValidRoutePath(value.routePath)) {
      context.addIssue({
        code: "custom",
        message: "Use a site route starting with / or a full http/https URL.",
        path: ["routePath"],
      });
    }
  })
  .transform((value) => ({
    description: value.description || null,
    iconKey: value.iconKey || null,
    imageAlt: value.imageAlt || null,
    imageUrl: value.imageUrl || null,
    isActive: value.isActive,
    name: value.name,
    routePath: normalizeRoutePath(value.routePath || "", slugifyCategory(value.slug || value.name)),
    showOnHomepage: value.showOnHomepage,
    slug: slugifyCategory(value.slug || value.name),
    sortOrder: value.sortOrder,
    type: value.type,
  }));
