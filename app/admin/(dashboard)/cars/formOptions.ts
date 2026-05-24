import {
  CarBodyType,
  CarCondition,
  CarFeatureType,
  CarSaleStatus,
  FuelType,
  StockType,
  TransmissionType,
} from "../../../../lib/generated/prisma/enums";

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
