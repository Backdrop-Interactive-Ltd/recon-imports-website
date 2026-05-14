"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import {
  auctionSheetRequestIdSchema,
  auctionSheetStatusSchema,
  paymentStatusSchema,
  reportUrlSchema,
  type AuctionSheetAdminActionState,
} from "./validation";

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateAuctionSheetViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/auction-sheet-requests");
}

async function requestExists(id: string) {
  const request = await prisma.auctionSheetRequest.findUnique({
    select: { id: true },
    where: { id },
  });

  return Boolean(request);
}

export async function updateAuctionSheetStatusAction(
  requestId: string,
  status: string,
): Promise<AuctionSheetAdminActionState> {
  await requireAdminSession();

  const id = auctionSheetRequestIdSchema.safeParse(requestId);
  const parsedStatus = auctionSheetStatusSchema.safeParse(status);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Request id is missing.",
      status: "error",
    };
  }

  if (!parsedStatus.success) {
    return {
      errors: { status: parsedStatus.error.issues[0]?.message },
      message: "Choose a valid request status.",
      status: "error",
    };
  }

  if (!(await requestExists(id.data))) {
    return {
      errors: { form: "Request was not found." },
      message: "Request was not found.",
      status: "error",
    };
  }

  await prisma.auctionSheetRequest.update({
    data: { status: parsedStatus.data },
    where: { id: id.data },
  });

  revalidateAuctionSheetViews();

  return {
    message: "Request status updated.",
    status: "success",
  };
}

export async function updateAuctionSheetPaymentStatusAction(
  requestId: string,
  paymentStatus: string,
): Promise<AuctionSheetAdminActionState> {
  await requireAdminSession();

  const id = auctionSheetRequestIdSchema.safeParse(requestId);
  const parsedPaymentStatus = paymentStatusSchema.safeParse(paymentStatus);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Request id is missing.",
      status: "error",
    };
  }

  if (!parsedPaymentStatus.success) {
    return {
      errors: { paymentStatus: parsedPaymentStatus.error.issues[0]?.message },
      message: "Choose a valid payment status.",
      status: "error",
    };
  }

  if (!(await requestExists(id.data))) {
    return {
      errors: { form: "Request was not found." },
      message: "Request was not found.",
      status: "error",
    };
  }

  await prisma.auctionSheetRequest.update({
    data: { paymentStatus: parsedPaymentStatus.data },
    where: { id: id.data },
  });

  revalidateAuctionSheetViews();

  return {
    message: "Payment status updated.",
    status: "success",
  };
}

export async function updateAuctionSheetReportUrlAction(
  requestId: string,
  reportUrl: string,
): Promise<AuctionSheetAdminActionState> {
  await requireAdminSession();

  const id = auctionSheetRequestIdSchema.safeParse(requestId);
  const parsedReportUrl = reportUrlSchema.safeParse(reportUrl);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Request id is missing.",
      status: "error",
    };
  }

  if (!parsedReportUrl.success) {
    return {
      errors: { reportUrl: parsedReportUrl.error.issues[0]?.message },
      message: "Enter a valid report URL.",
      status: "error",
    };
  }

  if (!(await requestExists(id.data))) {
    return {
      errors: { form: "Request was not found." },
      message: "Request was not found.",
      status: "error",
    };
  }

  await prisma.auctionSheetRequest.update({
    data: { reportUrl: parsedReportUrl.data || null },
    where: { id: id.data },
  });

  revalidateAuctionSheetViews();

  return {
    message: "Report URL updated.",
    status: "success",
  };
}

export async function deleteAuctionSheetRequestAction(requestId: string): Promise<AuctionSheetAdminActionState> {
  await requireAdminSession();

  const id = auctionSheetRequestIdSchema.safeParse(requestId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Request id is missing.",
      status: "error",
    };
  }

  if (!(await requestExists(id.data))) {
    return {
      errors: { form: "Request was not found." },
      message: "Request was not found.",
      status: "error",
    };
  }

  await prisma.auctionSheetRequest.delete({
    where: { id: id.data },
  });

  revalidateAuctionSheetViews();

  return {
    message: "Auction sheet request deleted successfully.",
    status: "success",
  };
}
