import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { configureCloudinary, getCloudinaryConfig, uploadImageBuffer } from "../../../../lib/uploads/cloudinary";
import { validateAdminImageFile } from "../../../../lib/uploads/imageRules";

export const runtime = "nodejs";

const uploadFolders = new Set(["brands", "cars", "categories", "hero", "homepage", "media"]);

function getSafeFolder(value: FormDataEntryValue | null) {
  const folder = typeof value === "string" ? value : "media";

  if (!uploadFolders.has(folder)) {
    return "media";
  }

  return folder;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const config = getCloudinaryConfig();

  if (!config) {
    return NextResponse.json(
      {
        error: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  const validationError = validateAdminImageFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  configureCloudinary();

  try {
    const folder = getSafeFolder(formData.get("folder"));
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImageBuffer(buffer, folder);
    let mediaId: string | undefined;

    try {
      const media = await prisma.media.create({
        data: {
          fileName: file.name,
          fileType: file.type,
          fileUrl: result.secure_url,
          folder,
          size: file.size,
        },
        select: {
          id: true,
        },
      });

      mediaId = media.id;
    } catch (error) {
      console.error("Image uploaded, but media record creation failed.", error);
    }

    return NextResponse.json({
      mediaId,
      publicId: result.public_id,
      url: result.secure_url,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }
}
