export type NewsletterActionState = {
  errors?: Partial<Record<"email" | "form", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialNewsletterActionState: NewsletterActionState = {
  message: "",
  status: "idle",
};
