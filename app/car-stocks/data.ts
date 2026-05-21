import { prisma } from "../../lib/prisma";
import { getOptimizedCloudinaryImageUrl, getOptimizedCloudinaryImageUrls } from "../../lib/cloudinaryImages";
import { getCarPublicPath } from "../../lib/carPublicRoutes";
import {
  CarFeatureType,
  CarSaleStatus,
  FuelType,
  type CarBodyType,
  type StockType,
  type TransmissionType,
} from "../../lib/generated/prisma/enums";
import type { Prisma } from "../../lib/generated/prisma/client";
import { brandOptions as fallbackBrandOptions, getBrandBySlug } from "./brands";
import { getCarBySlug, getSuggestedCars, inventory, type CarInventoryItem } from "./inventory";

export type PublicBrandOption = {
  name: string;
  slug: string;
};

export type PublicStockData = {
  brands: PublicBrandOption[];
  cars: CarInventoryItem[];
};

export type PublicCarDetail = {
  product: CarInventoryItem;
  suggestedItems: {
    image: string;
    name: string;
    publicPath?: string;
    slug: string;
  }[];
};

const publicCarInclude = {
  brand: true,
  features: {
    orderBy: [
      { type: "asc" },
      { sortOrder: "asc" },
      { title: "asc" },
    ],
  },
  images: {
    orderBy: [
      { isPrimary: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  },
} satisfies Prisma.CarInclude;

type PublicCarRecord = Prisma.CarGetPayload<{
  include: typeof publicCarInclude;
}>;

const publicVisibleCarWhere = {
  isPublished: true,
  saleStatus: {
    not: CarSaleStatus.SOLD,
  },
} satisfies Prisma.CarWhereInput;

const bodyLabels: Record<CarBodyType, string> = {
  CROSSOVER: "Crossover",
  HATCHBACK: "Hatchback",
  MPV: "MPV",
  OTHER: "Other",
  PASSENGER_VAN: "Passenger Van",
  SEDAN: "Sedan",
  SUV: "SUV",
  WAGON: "Wagon",
};

const stockTypeLabels: Record<StockType, CarInventoryItem["type"]> = {
  BRAND_NEW: "Brand New",
  PRE_ORDER: "Pre Order",
  PRE_OWNED: "Pre Owned",
  RECONDITIONED: "Reconditioned",
};

const stockTypeByLabel: Record<CarInventoryItem["type"], StockType> = {
  "Brand New": "BRAND_NEW",
  "Pre Order": "PRE_ORDER",
  "Pre Owned": "PRE_OWNED",
  Reconditioned: "RECONDITIONED",
};

const saleStatusLabels = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
} as const;

const transmissionLabels: Record<TransmissionType, string> = {
  AUTOMATIC: "Automatic",
  CVT: "CVT",
  E_CVT: "E-cvt",
  MANUAL: "Manual",
  OTHER: "Other",
  SEMI_AUTOMATIC: "Semi-automatic",
  TIPTRONIC: "Tiptronic",
};

const fallbackImagesByBody: Record<string, string> = {
  Crossover: "/cat-crossover.webp",
  Hatchback: "/stock-axio.webp",
  MPV: "/cat-mpv.webp",
  "Passenger Van": "/cat-mpv.webp",
  Sedan: "/stock-noah-black.webp",
  SUV: "/cat-suv.webp",
  Wagon: "/cat-wagon.webp",
};

function fuelLabel(fuelType: PublicCarRecord["fuelType"]) {
  if (fuelType === FuelType.OCTANE_HYBRID) return "Octane (H)";
  return fuelType
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createDescription(car: PublicCarRecord) {
  return `Indulge in refined comfort with this ${car.model} ${car.title}, available for purchase from Recon Imports. The vehicle is prepared for buyers who want strong road presence, comfort, and dependable daily usability.`;
}

function mapDatabaseCar(car: PublicCarRecord): CarInventoryItem {
  const body = bodyLabels[car.bodyType];
  const gallery = getOptimizedCloudinaryImageUrls(car.images.map((image) => image.imageUrl));
  const primaryImage = gallery[0] ?? fallbackImagesByBody[body] ?? "/cat-suv.webp";
  const features = car.features
    .filter((feature) => feature.type === CarFeatureType.FEATURE)
    .map((feature) => feature.title);
  const safetyFeatures = car.features
    .filter((feature) => feature.type === CarFeatureType.SAFETY)
    .map((feature) => feature.title);
  const fuel = fuelLabel(car.fuelType);

  return {
    availability: car.stockType === "PRE_ORDER" ? "Pre Order" : "Available",
    body,
    brand: car.brand.name,
    brandSlug: car.brand.slug,
    chassisNumber: car.chassisNumber || "N/A",
    description: car.description || createDescription(car),
    detailBody: body,
    detailFuel: fuel.toUpperCase(),
    detailMileage: car.mileage.toUpperCase(),
    drive: car.driveTrain || "N/A",
    engine: car.engine || "N/A",
    exterior: car.exteriorColor || "N/A",
    features,
    fuel,
    gallery: gallery.length > 0 ? gallery : [primaryImage],
    hero: primaryImage,
    id: car.slug,
    image: primaryImage,
    isEv: car.fuelType === FuelType.ELECTRIC,
    mileage: car.mileage,
    model: car.model,
    name: car.title,
    price: car.price,
    publicPath: getCarPublicPath({ slug: car.slug, stockType: car.stockType }),
    regYear: String(car.year),
    saleStatus: saleStatusLabels[car.saleStatus],
    safetyFeatures,
    suggestedImage: primaryImage,
    transmission: transmissionLabels[car.transmission].toUpperCase(),
    type: stockTypeLabels[car.stockType],
    videoImage: car.videoImageUrl ? getOptimizedCloudinaryImageUrl(car.videoImageUrl) : primaryImage,
    youtubeVideoUrl: car.youtubeVideoUrl,
    wheel: car.wheelSize || "N/A",
    year: String(car.year),
  };
}

function getBrandsFromCars(cars: CarInventoryItem[]): PublicBrandOption[] {
  const brands = new Map<string, PublicBrandOption>();

  cars.forEach((car) => {
    const slug = car.brandSlug ?? fallbackBrandOptions.find((brand) => brand.name === car.brand)?.slug;
    if (slug && !brands.has(slug)) {
      brands.set(slug, { name: car.brand, slug });
    }
  });

  return Array.from(brands.values()).sort((first, second) => first.name.localeCompare(second.name));
}

function getUniqueCars(cars: CarInventoryItem[]) {
  const uniqueCars = new Map<string, CarInventoryItem>();

  cars.forEach((car) => {
    if (!uniqueCars.has(car.id)) {
      uniqueCars.set(car.id, car);
    }
  });

  return Array.from(uniqueCars.values());
}

async function getPublishedDatabaseCars() {
  return prisma.car.findMany({
    include: publicCarInclude,
    orderBy: [
      { isFeatured: "desc" },
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
    where: publicVisibleCarWhere,
  });
}

async function hasPublishedDatabaseCars() {
  const publishedCarsCount = await prisma.car.count({
    where: { isPublished: true },
  });

  return publishedCarsCount > 0;
}

export async function getHomepageDealCars(): Promise<CarInventoryItem[] | undefined> {
  try {
    const databaseCars = await prisma.car.findMany({
      include: publicCarInclude,
      orderBy: [
        { isFeatured: "desc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
      where: publicVisibleCarWhere,
    });

    if (databaseCars.length === 0) {
      return (await hasPublishedDatabaseCars()) ? [] : undefined;
    }

    return getUniqueCars(databaseCars.map(mapDatabaseCar));
  } catch (error) {
    console.error("Failed to load homepage deal cars from database.", error);
    return undefined;
  }
}

export async function getPublicStockData(): Promise<PublicStockData> {
  try {
    const databaseCars = await getPublishedDatabaseCars();

    if (databaseCars.length === 0 && !(await hasPublishedDatabaseCars())) {
      return {
        brands: [...fallbackBrandOptions],
        cars: inventory,
      };
    }

    const cars = getUniqueCars(databaseCars.map(mapDatabaseCar));

    return {
      brands: getBrandsFromCars(cars),
      cars,
    };
  } catch (error) {
    console.error("Failed to load public stock from database.", error);
    return {
      brands: [...fallbackBrandOptions],
      cars: inventory,
    };
  }
}

export async function getPublicCarDetail(slug: string): Promise<PublicCarDetail | null> {
  try {
    const databaseCars = await getPublishedDatabaseCars();

    if (databaseCars.length > 0) {
      const cars = getUniqueCars(databaseCars.map(mapDatabaseCar));
      const product = cars.find((car) => car.id === slug);

      if (!product) return null;

      const suggestedItems = cars
        .filter((car) => car.id !== product.id)
        .sort((first, second) => {
          const firstScore = Number(first.brand === product.brand) + Number(first.body === product.body);
          const secondScore = Number(second.brand === product.brand) + Number(second.body === product.body);
          return secondScore - firstScore;
        })
        .slice(0, 8)
        .map((car) => ({
          image: car.suggestedImage ?? car.image,
          name: car.name,
          publicPath: car.publicPath,
          slug: car.id,
        }));

      return {
        product,
        suggestedItems,
      };
    }

    if (await hasPublishedDatabaseCars()) {
      return null;
    }
  } catch (error) {
    console.error("Failed to load public car detail from database.", error);
  }

  const fallbackProduct = getCarBySlug(slug);

  if (!fallbackProduct) return null;

  return {
    product: fallbackProduct,
    suggestedItems: getSuggestedCars(fallbackProduct.id),
  };
}

export async function getPublicBrandBySlug(slug: string): Promise<PublicBrandOption | null> {
  try {
    const databaseBrand = await prisma.brand.findUnique({
      select: {
        name: true,
        slug: true,
      },
      where: { slug },
    });

    if (databaseBrand) return databaseBrand;
  } catch (error) {
    console.error("Failed to load public brand from database.", error);
  }

  return getBrandBySlug(slug) ?? null;
}

export async function getPublicBrandStaticParams() {
  try {
    const databaseBrands = await prisma.brand.findMany({
      select: { slug: true },
      where: {
        cars: {
          some: publicVisibleCarWhere,
        },
      },
    });

    if (databaseBrands.length > 0) {
      return databaseBrands.map((brand) => ({ brand: brand.slug }));
    }

    if (await hasPublishedDatabaseCars()) {
      return [];
    }
  } catch (error) {
    console.error("Failed to load public brand params from database.", error);
  }

  return fallbackBrandOptions.map((brand) => ({ brand: brand.slug }));
}

export async function getPublicCarStaticParams(stockType?: StockType) {
  try {
    const databaseCars = await prisma.car.findMany({
      select: { slug: true },
      where: {
        ...publicVisibleCarWhere,
        ...(stockType ? { stockType } : {}),
      },
    });

    if (databaseCars.length > 0) {
      return databaseCars.map((car) => ({ slug: car.slug }));
    }

    if (await hasPublishedDatabaseCars()) {
      return [];
    }
  } catch (error) {
    console.error("Failed to load public car params from database.", error);
  }

  return inventory
    .filter((car) => !stockType || stockTypeByLabel[car.type] === stockType)
    .map((car) => ({ slug: car.id }));
}
