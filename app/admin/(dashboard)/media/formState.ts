export type MediaActionState = {
  errors?: Partial<Record<"form" | "id", string>>;
  message: string;
  status: "idle" | "error" | "success";
};
