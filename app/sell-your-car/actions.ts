"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { configureCloudinary, getUploadedImageDeliveryUrl, uploadImageBuffer } from "../../lib/uploads/cloudinary";
import { validateAdminImageFile } from "../../lib/uploads/imageRules";
import { sellCarLeadFormSchema, type SellCarLeadActionState } from "./validation";

const maxLeadImages = 8;

function fieldErrorState(error: ReturnType<typeof sellCarLeadFormSchema.safeParse>): SellCarLeadActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      carName: flattened.carName?.[0],
      mileage: flattened.mileage?.[0],
      model: flattened.model?.[0],
      name: flattened.name?.[0],
      offeredPrice: flattened.offeredPrice?.[0],
      phone: flattened.phone?.[0],
      registrationYear: flattened.registrationYear?.[0],
      terms: flattened.terms?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readSellCarLeadForm(formData: FormData) {
  return {
    carName: String(formData.get("carName") ?? ""),
    mileage: String(formData.get("mileage") ?? ""),
    model: String(formData.get("model") ?? ""),
    name: String(formData.get("name") ?? ""),
    offeredPrice: String(formData.get("offeredPrice") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    registrationYear: String(formData.get("registrationYear") ?? ""),
    terms: formData.get("terms") === "on",
  };
}

function getImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0 && Boolean(value.name));
}

async function uploadLeadImages(files: File[]) {
  if (files.length === 0) {
    return {
      imageUrls: [] as string[],
    };
  }

  if (files.length > maxLeadImages) {
    return {
      error: `Upload up to ${maxLeadImages} images.`,
    };
  }

  for (const file of files) {
    const validationError = validateAdminImageFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (validationError) {
      return {
        error: validationError,
      };
    }
  }

  if (!configureCloudinary()) {
    return {
      error: "Image upload is not configured. Submit without images or configure Cloudinary.",
    };
  }

  try {
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadImageBuffer(buffer, "sell-car-leads");
        return getUploadedImageDeliveryUrl(result);
      }),
    );

    return {
      imageUrls: uploadedImages,
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Image upload failed. Please try again.",
    };
  }
}

export async function submitSellCarLeadAction(
  _previousState: SellCarLeadActionState,
  formData: FormData,
): Promise<SellCarLeadActionState> {
  const parsed = sellCarLeadFormSchema.safeParse(readSellCarLeadForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  const uploaded = await uploadLeadImages(getImageFiles(formData));

  if ("error" in uploaded) {
    const errorMessage = uploaded.error ?? "Image upload failed. Please try again.";

    return {
      errors: { images: errorMessage },
      message: errorMessage,
      status: "error",
    };
  }

  await prisma.sellCarLead.create({
    data: {
      carName: parsed.data.carName,
      imageUrls: uploaded.imageUrls,
      mileage: parsed.data.mileage || null,
      model: parsed.data.model || null,
      name: parsed.data.name,
      offeredPrice: parsed.data.offeredPrice || null,
      phone: parsed.data.phone,
      registrationYear: parsed.data.registrationYear || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sell-car-leads");

  return {
    message: "Your car details were submitted successfully. Our team will contact you shortly.",
    status: "success",
  };
}
