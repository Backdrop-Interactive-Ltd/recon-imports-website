"use server";

import { revalidatePath } from "next/cache";
import { AuctionSheetStatus, PaymentStatus } from "../../lib/generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { auctionSheetReportFee } from "./constants";
import { auctionSheetRequestFormSchema, type AuctionSheetRequestActionState } from "./validation";

function fieldErrorState(error: ReturnType<typeof auctionSheetRequestFormSchema.safeParse>): AuctionSheetRequestActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      chassisNumber: flattened.chassisNumber?.[0],
      email: flattened.email?.[0],
      name: flattened.name?.[0],
      phone: flattened.phone?.[0],
      terms: flattened.terms?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readAuctionSheetRequestForm(formData: FormData) {
  return {
    chassisNumber: String(formData.get("chassisNumber") ?? ""),
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    terms: formData.get("terms") === "on",
  };
}

export async function submitAuctionSheetRequestAction(
  _previousState: AuctionSheetRequestActionState,
  formData: FormData,
): Promise<AuctionSheetRequestActionState> {
  const parsed = auctionSheetRequestFormSchema.safeParse(readAuctionSheetRequestForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  await prisma.auctionSheetRequest.create({
    data: {
      chassisNumber: parsed.data.chassisNumber.toUpperCase(),
      email: parsed.data.email,
      feeAmount: auctionSheetReportFee,
      name: parsed.data.name,
      paymentStatus: PaymentStatus.PENDING,
      phone: parsed.data.phone,
      status: AuctionSheetStatus.NEW,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/auction-sheet-requests");

  return {
    message: "Your auction sheet verification request was submitted successfully. Payment integration will be added later.",
    status: "success",
  };
}
