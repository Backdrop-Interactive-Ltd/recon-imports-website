import { z } from "zod";
import {
  CarBodyType,
  CarCondition,
  CarFeatureType,
  CarSaleStatus,
  FuelType,
  StockType,
  TransmissionType,
} from "../../../../lib/generated/prisma/enums";
import { getYouTubeVideoId } from "../../../../lib/youtube";

export type CarActionState = {
  errors?: Partial<
    Record<
      | "bodyType"
      | "brandId"
      | "chassisNumber"
      | "condition"
      | "description"
      | "driveTrain"
      | "engine"
      | "exteriorColor"
      | "features"
      | "form"
      | "fuelType"
      | "grade"
      | "id"
      | "images"
      | "interiorColor"
      | "isFeatured"
      | "isPublished"
      | "location"
      | "mileage"
      | "model"
      | "origin"
      | "packageName"
      | "price"
      | "saleStatus"
      | "slug"
      | "stockType"
      | "title"
      | "transmission"
      | "videoImageUrl"
      | "wheelSize"
      | "youtubeVideoUrl"
      | "year",
      string
    >
  >;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialCarActionState: CarActionState = {
  message: "",
  status: "idle",
};

export const bodyTypeOptions = Object.values(CarBodyType);
export const fuelTypeOptions = Object.values(FuelType);
export const transmissionOptions = Object.values(TransmissionType);
export const conditionOptions = Object.values(CarCondition);
export const stockTypeOptions = Object.values(StockType);
export const saleStatusOptions = Object.values(CarSaleStatus);
export const featureTypeOptions = Object.values(CarFeatureType);

export function slugifyCar(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function isValidUrl(value: string) {
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

const optionalText = z.string().trim().max(160, "Value is too long.").optional();
const optionalUrl = z.string().trim().max(500, "URL is too long.").optional();

const carImageSchema = z
  .object({
    altText: z.string().trim().max(140, "Alt text is too long.").optional(),
    imageUrl: z.string().trim().max(500, "Image URL is too long."),
    isPrimary: z.boolean(),
    sortOrder: z.coerce
      .number({ error: "Image sort order must be a number." })
      .int("Image sort order must be a whole number.")
      .min(0, "Image sort order cannot be negative.")
      .max(9999, "Image sort order is too high."),
  })
  .superRefine((value, context) => {
    if (!value.imageUrl) {
      context.addIssue({
        code: "custom",
        message: "Image URL is required.",
        path: ["imageUrl"],
      });
    }

    if (value.imageUrl && !isValidUrl(value.imageUrl)) {
      context.addIssue({
        code: "custom",
        message: "Use a full http/https URL or a site-relative path starting with /.",
        path: ["imageUrl"],
      });
    }
  })
  .transform((value) => ({
    altText: value.altText || null,
    imageUrl: value.imageUrl,
    isPrimary: value.isPrimary,
    sortOrder: value.sortOrder,
  }));

const carFeatureSchema = z.object({
  sortOrder: z.coerce
    .number({ error: "Feature sort order must be a number." })
    .int("Feature sort order must be a whole number.")
    .min(0, "Feature sort order cannot be negative.")
    .max(9999, "Feature sort order is too high."),
  title: z.string().trim().min(1, "Feature title is required.").max(120, "Feature title is too long."),
  type: z.enum(featureTypeOptions, { error: "Choose a valid feature type." }),
});

export const carIdSchema = z.string().trim().min(1, "Car id is required.");

export const carFormSchema = z
  .object({
    bodyType: z.enum(bodyTypeOptions, { error: "Choose a valid body type." }),
    brandId: z.string().trim().min(1, "Brand selection is required."),
    chassisNumber: z.string().trim().max(80, "Chassis number is too long.").optional(),
    condition: z.enum(conditionOptions, { error: "Choose a valid condition." }),
    description: z.string().trim().max(5000, "Description is too long.").optional(),
    driveTrain: optionalText,
    engine: optionalText,
    exteriorColor: optionalText,
    features: z.array(carFeatureSchema),
    fuelType: z.enum(fuelTypeOptions, { error: "Choose a valid fuel type." }),
    grade: optionalText,
    images: z.array(carImageSchema),
    interiorColor: optionalText,
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
    location: optionalText,
    mileage: z.string().trim().min(1, "Mileage is required.").max(80, "Mileage is too long."),
    model: z.string().trim().min(1, "Model is required.").max(80, "Model is too long."),
    origin: optionalText,
    packageName: optionalText,
    price: z.coerce
      .number({ error: "Price must be a number." })
      .int("Price must be a whole number.")
      .min(0, "Price cannot be negative.")
      .max(999999999, "Price is too high."),
    saleStatus: z.enum(saleStatusOptions, { error: "Choose a valid sale status." }),
    slug: z.string().trim().max(120, "Slug is too long.").optional(),
    stockType: z.enum(stockTypeOptions, { error: "Choose a valid stock type." }),
    title: z.string().trim().min(1, "Title is required.").max(140, "Title is too long."),
    transmission: z.enum(transmissionOptions, { error: "Choose a valid transmission." }),
    videoImageUrl: optionalUrl,
    wheelSize: z.string().trim().max(80, "Wheel size is too long.").optional(),
    youtubeVideoUrl: optionalUrl,
    year: z.coerce
      .number({ error: "Year must be a number." })
      .int("Year must be a whole number.")
      .min(1900, "Year is too old.")
      .max(new Date().getFullYear() + 2, "Year is too far in the future."),
  })
  .superRefine((value, context) => {
    const slug = slugifyCar(value.slug || value.title);

    if (!slug) {
      context.addIssue({
        code: "custom",
        message: "Slug is required.",
        path: ["slug"],
      });
    }

    if (value.videoImageUrl && !isValidUrl(value.videoImageUrl)) {
      context.addIssue({
        code: "custom",
        message: "Use a full http/https URL or a site-relative path starting with /.",
        path: ["videoImageUrl"],
      });
    }

    if (value.youtubeVideoUrl && !getYouTubeVideoId(value.youtubeVideoUrl)) {
      context.addIssue({
        code: "custom",
        message: "Use a valid YouTube URL from youtube.com, youtu.be, /shorts/, or /embed/.",
        path: ["youtubeVideoUrl"],
      });
    }
  })
  .transform((value) => {
    const images = value.images.map((image, index) => ({
      ...image,
      isPrimary: value.images.some((item) => item.isPrimary) ? image.isPrimary : index === 0,
    }));

    return {
      ...value,
      chassisNumber: value.chassisNumber || null,
      description: value.description || null,
      driveTrain: value.driveTrain || null,
      engine: value.engine || null,
      exteriorColor: value.exteriorColor || null,
      grade: value.grade || null,
      images,
      interiorColor: value.interiorColor || null,
      location: value.location || null,
      origin: value.origin || null,
      packageName: value.packageName || null,
      slug: slugifyCar(value.slug || value.title),
      videoImageUrl: value.videoImageUrl || null,
      wheelSize: value.wheelSize || null,
      youtubeVideoUrl: value.youtubeVideoUrl || null,
    };
  });
