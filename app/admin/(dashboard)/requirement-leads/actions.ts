"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { requirementLeadIdSchema, requirementLeadStatusSchema, type RequirementLeadActionState } from "./validation";

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateRequirementLeadViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/requirement-leads");
}

export async function updateRequirementLeadStatusAction(leadId: string, status: string): Promise<RequirementLeadActionState> {
  await requireAdminSession();

  const id = requirementLeadIdSchema.safeParse(leadId);
  const parsedStatus = requirementLeadStatusSchema.safeParse(status);

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

  const lead = await prisma.requirementLead.findUnique({
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

  await prisma.requirementLead.update({
    data: { status: parsedStatus.data },
    where: { id: id.data },
  });

  revalidateRequirementLeadViews();

  return {
    message: "Lead status updated.",
    status: "success",
  };
}

export async function deleteRequirementLeadAction(leadId: string): Promise<RequirementLeadActionState> {
  await requireAdminSession();

  const id = requirementLeadIdSchema.safeParse(leadId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Lead id is missing.",
      status: "error",
    };
  }

  const lead = await prisma.requirementLead.findUnique({
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

  await prisma.requirementLead.delete({
    where: { id: id.data },
  });

  revalidateRequirementLeadViews();

  return {
    message: "Lead deleted successfully.",
    status: "success",
  };
}
