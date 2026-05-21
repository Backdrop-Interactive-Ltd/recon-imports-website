import { VehicleCategoryType } from "../lib/generated/prisma/enums";
import { getOptimizedCloudinaryImageUrl } from "../lib/cloudinaryImages";
import { prisma } from "../lib/prisma";
import { getSiteSettings } from "../lib/siteSettings";
import { getHomepageDealCars } from "./car-stocks/data";
import HomeClient, { type HomepageBrand, type HomepageCategory, type HomepageHeroSlide } from "./HomeClient";

export const dynamic = "force-dynamic";

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
    return getOptimizedCloudinaryImageUrl(cleanImageUrl);
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
      logoUrl: getOptimizedCloudinaryImageUrl(brand.logoUrl),
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
      image: getOptimizedCloudinaryImageUrl(slide.imageUrl),
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

export default async function Home() {
  const [brands, categories, heroSlides, siteSettings, deals] = await Promise.all([
    getHomepageBrands(),
    getHomepageCategories(),
    getHomepageHeroSlides(),
    getSiteSettings(),
    getHomepageDealCars(),
  ]);

  return (
    <HomeClient
      brands={brands}
      categories={categories}
      deals={deals}
      heroSlides={heroSlides}
      siteSettings={siteSettings}
    />
  );
}
