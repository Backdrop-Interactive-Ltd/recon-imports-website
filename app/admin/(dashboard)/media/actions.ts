"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { mediaIdSchema, type MediaActionState } from "./validation";

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

function revalidateMediaViews() {
  revalidatePath("/admin/media");
}

export async function deleteMediaRecordAction(mediaId: string): Promise<MediaActionState> {
  await requireAdminSession();

  const id = mediaIdSchema.safeParse(mediaId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Media id is missing.",
      status: "error",
    };
  }

  const media = await prisma.media.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!media) {
    return {
      errors: { form: "Media record was not found." },
      message: "Media record was not found.",
      status: "error",
    };
  }

  await prisma.media.delete({
    where: { id: id.data },
  });

  revalidateMediaViews();

  return {
    message: "Media record deleted safely. The Cloudinary asset was left untouched.",
    status: "success",
  };
}
