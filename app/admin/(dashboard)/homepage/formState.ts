export type HeroSlideActionState = {
  errors?: Partial<Record<"ctaLink" | "ctaText" | "form" | "id" | "imageUrl" | "isActive" | "sortOrder" | "subtitle" | "title", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialHeroSlideActionState: HeroSlideActionState = {
  message: "",
  status: "idle",
};
