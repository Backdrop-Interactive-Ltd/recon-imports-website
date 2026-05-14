"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { sellCarLeadIdSchema, sellCarLeadStatusSchema, type SellCarLeadActionState } from "./validation";

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateSellLeadViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/sell-car-leads");
}

export async function updateSellCarLeadStatusAction(leadId: string, status: string): Promise<SellCarLeadActionState> {
  await requireAdminSession();

  const id = sellCarLeadIdSchema.safeParse(leadId);
  const parsedStatus = sellCarLeadStatusSchema.safeParse(status);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Lead id is missing.",
      status: "error",
    };
  }

  if (!parsedStatus.success) {
    return {
      errors: { status: parsedStatus.error.issues[0]?.message },
      message: "Choose a valid lead status.",
      status: "error",
    };
  }

  const lead = await prisma.sellCarLead.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!lead) {
    return {
      errors: { form: "Lead was not found." },
      message: "Lead was not found.",
      status: "error",
    };
  }

  await prisma.sellCarLead.update({
    data: { status: parsedStatus.data },
    where: { id: id.data },
  });

  revalidateSellLeadViews();

  return {
    message: "Lead status updated.",
    status: "success",
  };
}

export async function deleteSellCarLeadAction(leadId: string): Promise<SellCarLeadActionState> {
  await requireAdminSession();

  const id = sellCarLeadIdSchema.safeParse(leadId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Lead id is missing.",
      status: "error",
    };
  }

  const lead = await prisma.sellCarLead.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!lead) {
    return {
      errors: { form: "Lead was not found." },
      message: "Lead was not found.",
      status: "error",
    };
  }

  await prisma.sellCarLead.delete({
    where: { id: id.data },
  });

  revalidateSellLeadViews();

  return {
    message: "Lead deleted successfully.",
    status: "success",
  };
}
