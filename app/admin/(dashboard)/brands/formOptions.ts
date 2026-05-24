export type BrandActionState = {
  errors?: Partial<Record<"form" | "id" | "isActive" | "logoUrl" | "name" | "slug", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialBrandActionState: BrandActionState = {
  message: "",
  status: "idle",
};

export function slugifyBrand(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
