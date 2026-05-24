export const paymentMethodOptions = ["bKash", "Nagad", "Rocket", "Bank Transfer"] as const;

export type AuctionSheetRequestActionState = {
  errors?: Partial<
    Record<"chassisNumber" | "email" | "form" | "name" | "paymentMethod" | "phone" | "senderNumber" | "terms" | "transactionId", string>
  >;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialAuctionSheetRequestActionState: AuctionSheetRequestActionState = {
  message: "",
  status: "idle",
};
