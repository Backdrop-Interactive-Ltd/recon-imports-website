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
      paymentMethod: flattened.paymentMethod?.[0],
      phone: flattened.phone?.[0],
      senderNumber: flattened.senderNumber?.[0],
      terms: flattened.terms?.[0],
      transactionId: flattened.transactionId?.[0],
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
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    senderNumber: String(formData.get("senderNumber") ?? ""),
    terms: formData.get("terms") === "on",
    transactionId: String(formData.get("transactionId") ?? ""),
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
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      phone: parsed.data.phone,
      senderNumber: parsed.data.senderNumber,
      status: AuctionSheetStatus.NEW,
      transactionId: parsed.data.transactionId.toUpperCase(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/auction-sheet-requests");

  return {
    message: "Your auction sheet verification request was submitted successfully. Our team will verify your payment manually.",
    status: "success",
  };
}
