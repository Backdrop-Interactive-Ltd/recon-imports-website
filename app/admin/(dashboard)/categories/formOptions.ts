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
