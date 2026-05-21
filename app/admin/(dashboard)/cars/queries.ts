import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { type Prisma } from "../../../../lib/generated/prisma/client";
import { CarSaleStatus, StockType } from "../../../../lib/generated/prisma/enums";
import { formatEnumLabel } from "./validation";

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatCarPrice(price: number) {
  return `BDT ${new Intl.NumberFormat("en-IN").format(price)}`;
}

const carInclude = {
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  features: {
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: {
      sortOrder: true,
      title: true,
      type: true,
    },
  },
  images: {
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      altText: true,
      imageUrl: true,
      isPrimary: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.CarInclude;

type CarWithRelations = Prisma.CarGetPayload<{
  include: typeof carInclude;
}>;

export type AdminCar = ReturnType<typeof mapAdminCar>;

export type AdminCarListFilters = {
  brandId?: string;
  featured?: string;
  published?: string;
  saleStatus?: string;
  sort?: string;
  stockType?: string;
};

function mapAdminCar(car: CarWithRelations) {
  return {
    ...car,
    bodyTypeLabel: formatEnumLabel(car.bodyType),
    conditionLabel: formatEnumLabel(car.condition),
    fuelTypeLabel: formatEnumLabel(car.fuelType),
    primaryImage: car.images.find((image) => image.isPrimary)?.imageUrl ?? car.images[0]?.imageUrl ?? "",
    saleStatusLabel: formatEnumLabel(car.saleStatus),
    stockTypeLabel: formatEnumLabel(car.stockType),
    transmissionLabel: formatEnumLabel(car.transmission),
    updatedAtLabel: dateFormatter.format(car.updatedAt),
  };
}

function getCarWhere(filters: AdminCarListFilters = {}) {
  const where: Prisma.CarWhereInput = {};

  if (filters.brandId) {
    where.brandId = filters.brandId;
  }

  if (filters.saleStatus && Object.values(CarSaleStatus).includes(filters.saleStatus as CarSaleStatus)) {
    where.saleStatus = filters.saleStatus as CarSaleStatus;
  }

  if (filters.stockType && Object.values(StockType).includes(filters.stockType as StockType)) {
    where.stockType = filters.stockType as StockType;
  }

  if (filters.published === "true") {
    where.isPublished = true;
  }

  if (filters.published === "false") {
    where.isPublished = false;
  }

  if (filters.featured === "true") {
    where.isFeatured = true;
  }

  return where;
}

function getCarOrderBy(sort?: string): Prisma.CarOrderByWithRelationInput[] {
  if (sort === "price-asc") return [{ price: "asc" }, { updatedAt: "desc" }];
  if (sort === "price-desc") return [{ price: "desc" }, { updatedAt: "desc" }];
  if (sort === "year-asc") return [{ year: "asc" }, { updatedAt: "desc" }];
  if (sort === "year-desc") return [{ year: "desc" }, { updatedAt: "desc" }];

  return [{ isPublished: "desc" }, { isFeatured: "desc" }, { updatedAt: "desc" }];
}

export async function getCarBrands() {
  return prisma.brand.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getAdminCars(filters: AdminCarListFilters = {}) {
  const cars = await prisma.car.findMany({
    include: carInclude,
    orderBy: getCarOrderBy(filters.sort),
    where: getCarWhere(filters),
  });

  return cars.map(mapAdminCar);
}

export async function getAdminCarById(id: string) {
  const car = await prisma.car.findUnique({
    include: carInclude,
    where: { id },
  });

  if (!car) {
    notFound();
  }

  return mapAdminCar(car);
}

export async function getAdminCarStats() {
  const [total, published, featured, available, reserved, sold] = await Promise.all([
    prisma.car.count(),
    prisma.car.count({ where: { isPublished: true } }),
    prisma.car.count({ where: { isFeatured: true } }),
    prisma.car.count({ where: { saleStatus: CarSaleStatus.AVAILABLE } }),
    prisma.car.count({ where: { saleStatus: CarSaleStatus.RESERVED } }),
    prisma.car.count({ where: { saleStatus: CarSaleStatus.SOLD } }),
  ]);

  return {
    available,
    featured,
    published,
    reserved,
    sold,
    total,
  };
}
