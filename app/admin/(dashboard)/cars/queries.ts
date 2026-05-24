import { notFound } from "next/navigation";
import { createPaginatedResult, getPaginationState, type PaginatedResult } from "../_components/listParams";
import { prisma } from "../../../../lib/prisma";
import { type Prisma } from "../../../../lib/generated/prisma/client";
import { CarSaleStatus, StockType } from "../../../../lib/generated/prisma/enums";
import { formatEnumLabel } from "./formOptions";

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatCarPrice(price: number) {
  return `BDT ${new Intl.NumberFormat("en-IN").format(price)}`;
}

const carDetailInclude = {
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
  include: typeof carDetailInclude;
}>;

export type AdminCar = ReturnType<typeof mapAdminCar>;
export type AdminCarListItem = ReturnType<typeof mapAdminCarListItem>;

export type AdminCarListFilters = {
  brandId?: string;
  featured?: string;
  page?: string;
  pageSize?: string;
  published?: string;
  q?: string;
  saleStatus?: string;
  sort?: string;
  stockType?: string;
};

const carListInclude = {
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      imageUrl: true,
      isPrimary: true,
    },
    take: 1,
  },
} satisfies Prisma.CarInclude;

type CarListRecord = Prisma.CarGetPayload<{
  include: typeof carListInclude;
}>;

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

function mapAdminCarListItem(car: CarListRecord) {
  return {
    ...car,
    bodyTypeLabel: formatEnumLabel(car.bodyType),
    conditionLabel: formatEnumLabel(car.condition),
    fuelTypeLabel: formatEnumLabel(car.fuelType),
    primaryImage: car.images[0]?.imageUrl ?? "",
    saleStatusLabel: formatEnumLabel(car.saleStatus),
    stockTypeLabel: formatEnumLabel(car.stockType),
    transmissionLabel: formatEnumLabel(car.transmission),
    updatedAtLabel: dateFormatter.format(car.updatedAt),
  };
}

function getCarWhere(filters: AdminCarListFilters = {}) {
  const where: Prisma.CarWhereInput = {};
  const query = filters.q?.trim();

  if (filters.brandId) {
    where.brandId = filters.brandId;
  }

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { slug: { contains: query } },
      { chassisNumber: { contains: query } },
      { model: { contains: query } },
      { brand: { name: { contains: query } } },
    ];
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

  if (filters.featured === "false") {
    where.isFeatured = false;
  }

  return where;
}

function getCarOrderBy(sort?: string): Prisma.CarOrderByWithRelationInput[] {
  if (sort === "oldest") return [{ createdAt: "asc" }];
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

export async function getAdminCars(filters: AdminCarListFilters = {}): Promise<PaginatedResult<AdminCarListItem>> {
  const pagination = getPaginationState(filters);
  const where = getCarWhere(filters);
  const [total, cars] = await Promise.all([
    prisma.car.count({ where }),
    prisma.car.findMany({
      include: carListInclude,
      orderBy: getCarOrderBy(filters.sort),
      skip: pagination.skip,
      take: pagination.take,
      where,
    }),
  ]);

  return createPaginatedResult(cars.map(mapAdminCarListItem), total, pagination);
}

export async function getAllAdminCars(filters: AdminCarListFilters = {}) {
  const cars = await prisma.car.findMany({
    include: carDetailInclude,
    orderBy: getCarOrderBy(filters.sort),
    where: getCarWhere(filters),
  });

  return cars.map(mapAdminCar);
}

export async function getAdminCarById(id: string) {
  const car = await prisma.car.findUnique({
    include: carDetailInclude,
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
