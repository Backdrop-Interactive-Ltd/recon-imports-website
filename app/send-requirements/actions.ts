"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { configureCloudinary, getUploadedImageDeliveryUrl, uploadImageBuffer } from "../../lib/uploads/cloudinary";
import { validateAdminImageFile } from "../../lib/uploads/imageRules";
import { requirementLeadFormSchema, type RequirementLeadActionState } from "./validation";

const maxLeadImages = 8;

function fieldErrorState(error: ReturnType<typeof requirementLeadFormSchema.safeParse>): RequirementLeadActionState {
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
      details: flattened.details?.[0],
      mileage: flattened.mileage?.[0],
      model: flattened.model?.[0],
      modelYear: flattened.modelYear?.[0],
      name: flattened.name?.[0],
      phone: flattened.phone?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readRequirementLeadForm(formData: FormData) {
  return {
    carName: String(formData.get("carName") ?? ""),
    details: String(formData.get("details") ?? ""),
    mileage: String(formData.get("mileage") ?? ""),
    model: String(formData.get("model") ?? ""),
    modelYear: String(formData.get("modelYear") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
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
        const result = await uploadImageBuffer(buffer, "requirement-leads");
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

export async function submitRequirementLeadAction(
  _previousState: RequirementLeadActionState,
  formData: FormData,
): Promise<RequirementLeadActionState> {
  const parsed = requirementLeadFormSchema.safeParse(readRequirementLeadForm(formData));

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

  await prisma.requirementLead.create({
    data: {
      carName: parsed.data.carName,
      details: parsed.data.details || null,
      imageUrls: uploaded.imageUrls,
      mileage: parsed.data.mileage || null,
      model: parsed.data.model || null,
      modelYear: parsed.data.modelYear || null,
      name: parsed.data.name,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requirement-leads");

  return {
    message: "Your requirements were submitted successfully. Our team will contact you shortly.",
    status: "success",
  };
}
