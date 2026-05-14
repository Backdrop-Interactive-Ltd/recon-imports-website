"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "../../lib/generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { newsletterSubscribeSchema, type NewsletterActionState } from "./validation";

function revalidateNewsletterViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/newsletter");
}

export async function subscribeNewsletterAction(
  _previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const parsed = newsletterSubscribeSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      errors: {
        email: flattened.email?.[0],
      },
      message: "Please enter a valid email address.",
      status: "error",
    };
  }

  try {
    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      select: {
        id: true,
        isActive: true,
      },
      where: {
        email: parsed.data.email,
      },
    });

    if (existingSubscriber?.isActive) {
      return {
        message: "You're already subscribed to our newsletter.",
        status: "success",
      };
    }

    if (existingSubscriber) {
      await prisma.newsletterSubscriber.update({
        data: {
          isActive: true,
        },
        where: {
          id: existingSubscriber.id,
        },
      });

      revalidateNewsletterViews();

      return {
        message: "Welcome back. Your newsletter subscription is active again.",
        status: "success",
      };
    }

    await prisma.newsletterSubscriber.create({
      data: {
        email: parsed.data.email,
      },
    });

    revalidateNewsletterViews();

    return {
      message: "Thanks for subscribing to our newsletter.",
      status: "success",
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        message: "You're already subscribed to our newsletter.",
        status: "success",
      };
    }

    console.error("Failed to subscribe newsletter email.", error);

    return {
      errors: {
        form: "Newsletter subscription failed.",
      },
      message: "Something went wrong. Please try again.",
      status: "error",
    };
  }
}
