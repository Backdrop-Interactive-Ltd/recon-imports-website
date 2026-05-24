export type RequirementLeadActionState = {
  errors?: Partial<Record<"carName" | "details" | "form" | "images" | "mileage" | "model" | "modelYear" | "name" | "phone", string>>;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialRequirementLeadActionState: RequirementLeadActionState = {
  message: "",
  status: "idle",
};
