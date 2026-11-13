import { NextResponse } from "next/server";
import { AdminAuthorizationError, requireAdminPermission } from "../../../../lib/adminAuthorization";
import { prisma } from "../../../../lib/prisma";
import {
  configureCloudinary,
  getCloudinaryConfig,
  getUploadedImageDeliveryUrl,
  uploadImageBuffer,
} from "../../../../lib/uploads/cloudinary";
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
  try {
    await requireAdminPermission("uploads.create");
  } catch (error) {
    if (!(error instanceof AdminAuthorizationError)) throw error;
    const status = error.code === "UNAVAILABLE" ? 503 : error.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: error.message }, { status });
  }

  const config = getCloudinaryConfig();

  if (!config && process.env.NODE_ENV !== "development") {
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
    let deliveryUrl: string;
    let publicId: string;
    if (config) {
      const result = await uploadImageBuffer(buffer, folder);
      deliveryUrl = getUploadedImageDeliveryUrl(result);
      publicId = result.public_id;
    } else if (process.env.NODE_ENV === "development") {
      // Keep local development usable without cloud credentials. Decode and
      // re-encode uploads so only raster image content is served publicly.
      const { uploadLocalDevelopmentImage } = await import("../../../../lib/uploads/local");
      ({ deliveryUrl, publicId } = await uploadLocalDevelopmentImage(buffer, folder));
    } else throw new Error("Persistent cloud media storage is required.");
    let mediaId: string | undefined;

    try {
      const media = await prisma.media.create({
        data: {
          fileName: file.name,
          fileType: file.type,
          fileUrl: deliveryUrl,
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
      publicId,
      url: deliveryUrl,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }
}
