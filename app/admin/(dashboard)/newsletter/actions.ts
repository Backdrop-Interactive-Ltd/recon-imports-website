"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { newsletterSubscriberIdSchema, type NewsletterSubscriberActionState } from "./validation";

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateNewsletterViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/newsletter");
}

export async function setNewsletterSubscriberActiveAction(
  subscriberId: string,
  isActive: boolean,
): Promise<NewsletterSubscriberActionState> {
  await requireAdminSession();

  const id = newsletterSubscriberIdSchema.safeParse(subscriberId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Subscriber id is missing.",
      status: "error",
    };
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!subscriber) {
    return {
      errors: { form: "Subscriber was not found." },
      message: "Subscriber was not found.",
      status: "error",
    };
  }

  await prisma.newsletterSubscriber.update({
    data: { isActive },
    where: { id: id.data },
  });

  revalidateNewsletterViews();

  return {
    message: isActive ? "Subscriber reactivated." : "Subscriber deactivated.",
    status: "success",
  };
}

export async function deleteNewsletterSubscriberAction(subscriberId: string): Promise<NewsletterSubscriberActionState> {
  await requireAdminSession();

  const id = newsletterSubscriberIdSchema.safeParse(subscriberId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Subscriber id is missing.",
      status: "error",
    };
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!subscriber) {
    return {
      errors: { form: "Subscriber was not found." },
      message: "Subscriber was not found.",
      status: "error",
    };
  }

  await prisma.newsletterSubscriber.delete({
    where: { id: id.data },
  });

  revalidateNewsletterViews();

  return {
    message: "Subscriber deleted successfully.",
    status: "success",
  };
}
