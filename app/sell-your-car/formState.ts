export type SellCarLeadActionState = {
  errors?: Partial<
    Record<"carName" | "form" | "images" | "mileage" | "model" | "name" | "offeredPrice" | "phone" | "registrationYear" | "terms", string>
  >;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialSellCarLeadActionState: SellCarLeadActionState = {
  message: "",
  status: "idle",
};
