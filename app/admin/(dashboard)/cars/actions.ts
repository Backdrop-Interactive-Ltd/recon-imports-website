"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { carFormSchema, carIdSchema, type CarActionState } from "./validation";

function fieldErrorState(error: ReturnType<typeof carFormSchema.safeParse>): CarActionState {
  if (error.success) {
    return {
      message: "",
      status: "idle",
    };
  }

  const flattened = error.error.flatten().fieldErrors;

  return {
    errors: {
      bodyType: flattened.bodyType?.[0],
      brandId: flattened.brandId?.[0],
      condition: flattened.condition?.[0],
      description: flattened.description?.[0],
      driveTrain: flattened.driveTrain?.[0],
      engine: flattened.engine?.[0],
      exteriorColor: flattened.exteriorColor?.[0],
      features: flattened.features?.[0],
      fuelType: flattened.fuelType?.[0],
      grade: flattened.grade?.[0],
      images: flattened.images?.[0],
      interiorColor: flattened.interiorColor?.[0],
      isFeatured: flattened.isFeatured?.[0],
      isPublished: flattened.isPublished?.[0],
      location: flattened.location?.[0],
      mileage: flattened.mileage?.[0],
      model: flattened.model?.[0],
      origin: flattened.origin?.[0],
      packageName: flattened.packageName?.[0],
      price: flattened.price?.[0],
      slug: flattened.slug?.[0],
      stockType: flattened.stockType?.[0],
      title: flattened.title?.[0],
      transmission: flattened.transmission?.[0],
      videoImageUrl: flattened.videoImageUrl?.[0],
      year: flattened.year?.[0],
    },
    message: "Please fix the highlighted fields.",
    status: "error",
  };
}

function readJsonArray(formData: FormData, key: string) {
  try {
    const value = JSON.parse(String(formData.get(key) ?? "[]"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readCarForm(formData: FormData) {
  const images = readJsonArray(formData, "images")
    .map((image) => ({
      altText: String(image.altText ?? ""),
      imageUrl: String(image.imageUrl ?? ""),
      isPrimary: Boolean(image.isPrimary),
      sortOrder: String(image.sortOrder ?? "0"),
    }))
    .filter((image) => image.imageUrl.trim());

  const features = readJsonArray(formData, "features")
    .map((feature) => ({
      sortOrder: String(feature.sortOrder ?? "0"),
      title: String(feature.title ?? ""),
      type: String(feature.type ?? ""),
    }))
    .filter((feature) => feature.title.trim());

  return {
    bodyType: String(formData.get("bodyType") ?? ""),
    brandId: String(formData.get("brandId") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    description: String(formData.get("description") ?? ""),
    driveTrain: String(formData.get("driveTrain") ?? ""),
    engine: String(formData.get("engine") ?? ""),
    exteriorColor: String(formData.get("exteriorColor") ?? ""),
    features,
    fuelType: String(formData.get("fuelType") ?? ""),
    grade: String(formData.get("grade") ?? ""),
    images,
    interiorColor: String(formData.get("interiorColor") ?? ""),
    isFeatured: formData.get("isFeatured") === "on",
    isPublished: formData.get("isPublished") === "on",
    location: String(formData.get("location") ?? ""),
    mileage: String(formData.get("mileage") ?? ""),
    model: String(formData.get("model") ?? ""),
    origin: String(formData.get("origin") ?? ""),
    packageName: String(formData.get("packageName") ?? ""),
    price: String(formData.get("price") ?? "0"),
    slug: String(formData.get("slug") ?? ""),
    stockType: String(formData.get("stockType") ?? ""),
    title: String(formData.get("title") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    videoImageUrl: String(formData.get("videoImageUrl") ?? ""),
    year: String(formData.get("year") ?? ""),
  };
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
}

async function isDuplicateSlug(slug: string, currentCarId?: string) {
  const existingCar = await prisma.car.findUnique({
    select: { id: true },
    where: { slug },
  });

  return Boolean(existingCar && existingCar.id !== currentCarId);
}

async function brandExists(brandId: string) {
  const brand = await prisma.brand.findUnique({
    select: { id: true },
    where: { id: brandId },
  });

  return Boolean(brand);
}

function revalidateCarViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/cars");
}

function normalizePrimaryImages<T extends { isPrimary: boolean }>(images: T[]) {
  const primaryIndex = images.findIndex((image) => image.isPrimary);
  const normalizedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return images.map((image, index) => ({
    ...image,
    isPrimary: index === normalizedPrimaryIndex,
  }));
}

export async function createCarAction(_previousState: CarActionState, formData: FormData): Promise<CarActionState> {
  await requireAdminSession();

  const parsed = carFormSchema.safeParse(readCarForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  if (!(await brandExists(parsed.data.brandId))) {
    return {
      errors: { brandId: "Choose an existing brand." },
      message: "Brand selection is required.",
      status: "error",
    };
  }

  if (await isDuplicateSlug(parsed.data.slug)) {
    return {
      errors: { slug: "This slug is already used by another car." },
      message: "Car slug must be unique.",
      status: "error",
    };
  }

  const { features, images, ...carData } = parsed.data;
  const normalizedImages = normalizePrimaryImages(images);

  await prisma.$transaction(async (transaction) => {
    const car = await transaction.car.create({
      data: carData,
      select: { id: true },
    });

    if (normalizedImages.length > 0) {
      await transaction.carImage.createMany({
        data: normalizedImages.map((image) => ({ ...image, carId: car.id })),
      });
    }

    if (features.length > 0) {
      await transaction.carFeature.createMany({
        data: features.map((feature) => ({ ...feature, carId: car.id })),
      });
    }
  });

  revalidateCarViews();

  return {
    message: "Car created successfully.",
    status: "success",
  };
}

export async function updateCarAction(_previousState: CarActionState, formData: FormData): Promise<CarActionState> {
  await requireAdminSession();

  const id = carIdSchema.safeParse(formData.get("id"));

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Car id is missing.",
      status: "error",
    };
  }

  const parsed = carFormSchema.safeParse(readCarForm(formData));

  if (!parsed.success) {
    return fieldErrorState(parsed);
  }

  const car = await prisma.car.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!car) {
    return {
      errors: { form: "Car was not found." },
      message: "Car was not found.",
      status: "error",
    };
  }

  if (!(await brandExists(parsed.data.brandId))) {
    return {
      errors: { brandId: "Choose an existing brand." },
      message: "Brand selection is required.",
      status: "error",
    };
  }

  if (await isDuplicateSlug(parsed.data.slug, id.data)) {
    return {
      errors: { slug: "This slug is already used by another car." },
      message: "Car slug must be unique.",
      status: "error",
    };
  }

  const { features, images, ...carData } = parsed.data;
  const normalizedImages = normalizePrimaryImages(images);

  await prisma.$transaction(async (transaction) => {
    await transaction.car.update({
      data: carData,
      where: { id: id.data },
    });

    await transaction.carImage.deleteMany({ where: { carId: id.data } });
    await transaction.carFeature.deleteMany({ where: { carId: id.data } });

    if (normalizedImages.length > 0) {
      await transaction.carImage.createMany({
        data: normalizedImages.map((image) => ({ ...image, carId: id.data })),
      });
    }

    if (features.length > 0) {
      await transaction.carFeature.createMany({
        data: features.map((feature) => ({ ...feature, carId: id.data })),
      });
    }
  });

  revalidateCarViews();

  return {
    message: "Car updated successfully.",
    status: "success",
  };
}

export async function setCarPublishedAction(carId: string, isPublished: boolean): Promise<CarActionState> {
  await requireAdminSession();

  const id = carIdSchema.safeParse(carId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Car id is missing.",
      status: "error",
    };
  }

  await prisma.car.update({
    data: { isPublished },
    where: { id: id.data },
  });

  revalidateCarViews();

  return {
    message: isPublished ? "Car published." : "Car unpublished.",
    status: "success",
  };
}

export async function setCarFeaturedAction(carId: string, isFeatured: boolean): Promise<CarActionState> {
  await requireAdminSession();

  const id = carIdSchema.safeParse(carId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Car id is missing.",
      status: "error",
    };
  }

  await prisma.car.update({
    data: { isFeatured },
    where: { id: id.data },
  });

  revalidateCarViews();

  return {
    message: isFeatured ? "Car marked featured." : "Car removed from featured.",
    status: "success",
  };
}

export async function deleteCarAction(carId: string): Promise<CarActionState> {
  await requireAdminSession();

  const id = carIdSchema.safeParse(carId);

  if (!id.success) {
    return {
      errors: { id: id.error.issues[0]?.message },
      message: "Car id is missing.",
      status: "error",
    };
  }

  const car = await prisma.car.findUnique({
    select: { id: true },
    where: { id: id.data },
  });

  if (!car) {
    return {
      errors: { form: "Car was not found." },
      message: "Car was not found.",
      status: "error",
    };
  }

  await prisma.car.delete({
    where: { id: id.data },
  });

  revalidateCarViews();

  return {
    message: "Car deleted successfully.",
    status: "success",
  };
}
