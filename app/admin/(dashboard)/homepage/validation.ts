import { z } from "zod";
export type { HeroSlideActionState } from "./formState";

function isValidImageUrl(value: string) {
  if (!value) return false;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidOptionalLink(value: string | undefined) {
  if (!value) return true;
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("tel:") || value.startsWith("mailto:")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const heroSlideIdSchema = z.string().trim().min(1, "Hero slide id is required.");

export const heroSlideFormSchema = z
  .object({
    ctaLink: z.string().trim().max(500, "CTA link is too long.").optional(),
    ctaText: z.string().trim().max(80, "CTA text is too long.").optional(),
    imageUrl: z.string().trim().min(1, "Hero image is required.").max(500, "Image URL is too long."),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int("Sort order must be a whole number.").min(0, "Sort order cannot be negative."),
    subtitle: z.string().trim().max(220, "Subtitle is too long.").optional(),
    title: z.string().trim().min(1, "Title is required.").max(120, "Title is too long."),
  })
  .superRefine((value, context) => {
    if (!isValidImageUrl(value.imageUrl)) {
      context.addIssue({
        code: "custom",
        message: "Use a full http/https URL or a site-relative path starting with /.",
        path: ["imageUrl"],
      });
    }

    if (!isValidOptionalLink(value.ctaLink)) {
      context.addIssue({
        code: "custom",
        message: "Use a full http/https URL, site-relative path, anchor, tel, or mailto link.",
        path: ["ctaLink"],
      });
    }
  })
  .transform((value) => ({
    ctaLink: value.ctaLink || null,
    ctaText: value.ctaText || null,
    imageUrl: value.imageUrl,
    isActive: value.isActive,
    sortOrder: value.sortOrder,
    subtitle: value.subtitle || null,
    title: value.title,
  }));
