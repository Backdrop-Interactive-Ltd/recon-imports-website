import { CarSaleStatus, VehicleCategoryType } from "../lib/generated/prisma/enums";
import { getBrandLogoImageUrl, getCarCardImageUrl, getHeroImageUrl } from "../lib/cloudinaryImages";
import { getCarPublicPath } from "../lib/carPublicRoutes";
import { prisma } from "../lib/prisma";
import { getSiteSettings } from "../lib/siteSettings";
import { getHomepageDealCars } from "./car-stocks/data";
import { inventory } from "./car-stocks/inventory";
import HomeClient, {
  type HomepageBrand,
  type HomepageCategory,
  type HomepageHeroSlide,
  type HomepageSearchItem,
} from "./HomeClient";

export const revalidate = 60;

const categoryRouteBySlug: Record<string, string> = {
  crossover: "/crossover",
  hatchback: "/hatchback",
  mpv: "/mpv",
  "passenger-van": "/passenger-van",
  "pre-order": "/pre-order",
  "pre-owned": "/pre-owned",
  reconditioned: "/reconditioned",
  sedan: "/sedan",
  suv: "/suv",
  wagon: "/wagon",
};

const categoryCopyBySlug: Record<string, string> = {
  crossover: "Blending sedan agility with the versatile, elevated stance of an SUV.",
  hatchback: "Compact, practical, and easy to handle for daily movement.",
  mpv: "Multi-purpose vehicles designed for maximum seating and flexibility.",
  "passenger-van": "Roomy passenger transport for groups, families, and business needs.",
  "pre-order": "Factory order and incoming vehicle options for planned purchases.",
  "pre-owned": "Imported pre-owned vehicles selected for quality, condition, and value.",
  reconditioned: "Fresh-condition Japanese vehicles prepared for dependable ownership.",
  sedan: "Comfortable city driving with a refined passenger-first profile.",
  suv: "Spacious and versatile for power and adventure.",
  wagon: "Practical long-roof vehicles with flexible passenger and cargo room.",
};

const categoryImageBySlug: Record<string, string> = {
  crossover: "/cat-crossover.webp",
  hatchback: "/stock-noah-white.webp",
  mpv: "/cat-mpv.webp",
  "passenger-van": "/cat-wagon.webp",
  "pre-order": "/cat-crossover.webp",
  "pre-owned": "/hero-slide-3.webp",
  reconditioned: "/hero-slide-2.webp",
  sedan: "/stock-axio.webp",
  suv: "/cat-suv.webp",
  wagon: "/cat-wagon.webp",
};

const defaultCategoryImage = "/cat-suv.webp";
const heroImageClasses = ["hero-image-default", "hero-image-focus-left", "hero-image-focus-right"];
const heroTextAnimations = ["hero-text-rise", "hero-text-track", "hero-text-scale"];
const bodyLabels = {
  CROSSOVER: "Crossover",
  HATCHBACK: "Hatchback",
  MPV: "MPV",
  OTHER: "Other",
  PASSENGER_VAN: "Passenger Van",
  SEDAN: "Sedan",
  SUV: "SUV",
  WAGON: "Wagon",
} as const;
const conditionLabels = {
  BRAND_NEW: "Brand New",
  PRE_OWNED: "Pre Owned",
  RECONDITIONED: "Reconditioned",
  USED: "Used",
} as const;
const stockTypeLabels = {
  BRAND_NEW: "Brand New",
  PRE_ORDER: "Pre Order",
  PRE_OWNED: "Pre Owned",
  RECONDITIONED: "Reconditioned",
} as const;
const fallbackSearchImage = "/cat-suv.webp";

function cleanOptionalValue(value?: string | null) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue || trimmedValue === "null" || trimmedValue === "undefined") {
    return "";
  }

  return trimmedValue;
}

function isValidImageSrc(value: string) {
  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getCategoryHref(slug: string, routePath?: string | null) {
  const cleanRoutePath = cleanOptionalValue(routePath);

  return cleanRoutePath || categoryRouteBySlug[slug] || `/${slug}`;
}

function getCategoryImage(slug: string, imageUrl?: string | null) {
  const cleanImageUrl = cleanOptionalValue(imageUrl);

  if (cleanImageUrl && isValidImageSrc(cleanImageUrl)) {
    return getCarCardImageUrl(cleanImageUrl);
  }

  return categoryImageBySlug[slug] || defaultCategoryImage;
}

async function getHomepageBrands(): Promise<HomepageBrand[] | undefined> {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        logoUrl: true,
        name: true,
        slug: true,
      },
      where: { isActive: true },
    });

    if (brands.length === 0) return undefined;

    return brands.map((brand) => ({
      ...brand,
      logoUrl: getBrandLogoImageUrl(brand.logoUrl),
    }));
  } catch (error) {
    console.error("Failed to load homepage brands from database.", error);
    return undefined;
  }
}

async function getHomepageCategories(): Promise<HomepageCategory[] | undefined> {
  try {
    const categories = await prisma.vehicleCategory.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      select: {
        description: true,
        id: true,
        iconKey: true,
        imageAlt: true,
        imageUrl: true,
        name: true,
        routePath: true,
        slug: true,
      },
      where: {
        isActive: true,
        showOnHomepage: true,
        type: VehicleCategoryType.BODY_TYPE,
      },
    });

    const visibleCategories = categories.filter((category) => {
      const routePath = getCategoryHref(category.slug, category.routePath);
      return category.slug !== "ev" && routePath !== "/ev";
    });

    if (visibleCategories.length === 0) return undefined;

    return visibleCategories.map((category) => ({
      id: category.id,
      copy:
        cleanOptionalValue(category.description) ||
        categoryCopyBySlug[category.slug] ||
        `Browse vehicles uploaded with ${category.name} selected as the category.`,
      href: getCategoryHref(category.slug, category.routePath),
      iconKey: cleanOptionalValue(category.iconKey) || "car",
      image: getCategoryImage(category.slug, category.imageUrl),
      imageAlt: cleanOptionalValue(category.imageAlt) || `${category.name} vehicle detail`,
      title: category.name,
    }));
  } catch (error) {
    console.error("Failed to load homepage categories from database.", error);
    return undefined;
  }
}

async function getHomepageHeroSlides(): Promise<HomepageHeroSlide[] | undefined> {
  try {
    const slides = await prisma.heroSlide.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        ctaLink: true,
        ctaText: true,
        imageUrl: true,
        subtitle: true,
        title: true,
      },
      where: { isActive: true },
    });

    if (slides.length === 0) return undefined;

    return slides.map((slide, index) => ({
      ctaLink: slide.ctaLink,
      ctaText: slide.ctaText,
      image: getHeroImageUrl(slide.imageUrl),
      imageClass: heroImageClasses[index % heroImageClasses.length],
      subtitle: slide.subtitle,
      textAnimation: heroTextAnimations[index % heroTextAnimations.length],
      title: slide.title,
    }));
  } catch (error) {
    console.error("Failed to load homepage hero slides from database.", error);
    return undefined;
  }
}

function getFallbackSearchItems(): HomepageSearchItem[] {
  return inventory.slice(0, 100).map((car) => ({
    brand: car.brand,
    condition: car.type,
    href: car.publicPath || getCarPublicPath({ id: car.id, type: car.type }),
    image: getCarCardImageUrl(car.image || fallbackSearchImage),
    name: car.name,
    price: car.price,
    searchText: `${car.brand} ${car.name} ${car.year} ${car.body} ${car.type}`.toLowerCase(),
    slug: car.id,
    stockType: car.type,
    year: car.year,
  }));
}

async function getHomepageSearchItems(): Promise<HomepageSearchItem[] | undefined> {
  try {
    const cars = await prisma.car.findMany({
      orderBy: [
        { isFeatured: "desc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        bodyType: true,
        brand: {
          select: {
            name: true,
          },
        },
        condition: true,
        images: {
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            imageUrl: true,
          },
          take: 1,
        },
        price: true,
        slug: true,
        stockType: true,
        title: true,
        year: true,
      },
      take: 100,
      where: {
        isPublished: true,
        saleStatus: {
          not: CarSaleStatus.SOLD,
        },
      },
    });

    if (cars.length === 0) {
      const publishedCarsCount = await prisma.car.count({
        where: { isPublished: true },
      });

      return publishedCarsCount > 0 ? [] : undefined;
    }

    return cars.map((car) => {
      const brand = car.brand.name;
      const body = bodyLabels[car.bodyType];
      const condition = conditionLabels[car.condition];
      const stockType = stockTypeLabels[car.stockType];
      const year = String(car.year);

      return {
        brand,
        condition,
        href: getCarPublicPath({ slug: car.slug, stockType: car.stockType }),
        image: getCarCardImageUrl(car.images[0]?.imageUrl || fallbackSearchImage),
        name: car.title,
        price: car.price,
        searchText: `${brand} ${car.title} ${year} ${body} ${stockType} ${condition}`.toLowerCase(),
        slug: car.slug,
        stockType,
        year,
      };
    });
  } catch (error) {
    console.error("Failed to load homepage search items from database.", error);
    return undefined;
  }
}

export default async function Home() {
  const [brands, categories, heroSlides, siteSettings, deals, searchItems] = await Promise.all([
    getHomepageBrands(),
    getHomepageCategories(),
    getHomepageHeroSlides(),
    getSiteSettings(),
    getHomepageDealCars(),
    getHomepageSearchItems(),
  ]);

  return (
    <HomeClient
      brands={brands}
      categories={categories}
      deals={deals}
      heroSlides={heroSlides}
      searchItems={searchItems ?? getFallbackSearchItems()}
      siteSettings={siteSettings}
    />
  );
}
