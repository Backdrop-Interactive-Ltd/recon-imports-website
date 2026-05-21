import type { MetadataRoute } from "next";
import { getCarPublicPath } from "../lib/carPublicRoutes";
import { CarSaleStatus } from "../lib/generated/prisma/enums";
import { prisma } from "../lib/prisma";

const siteUrl = "https://reconimports.com";
const now = new Date();

const staticRoutes = [
  { path: "/", priority: 1 },
  { path: "/brand-new", priority: 0.9 },
  { path: "/sell-your-car", priority: 0.75 },
  { path: "/send-requirements", priority: 0.75 },
  { path: "/verify-auction-sheet", priority: 0.75 },
  { path: "/sedan", priority: 0.7 },
  { path: "/hatchback", priority: 0.7 },
  { path: "/suv", priority: 0.7 },
  { path: "/crossover", priority: 0.7 },
  { path: "/mpv", priority: 0.7 },
  { path: "/passenger-van", priority: 0.7 },
  { path: "/pre-owned", priority: 0.7 },
  { path: "/pre-order", priority: 0.7 },
  { path: "/reconditioned", priority: 0.7 },
] satisfies { path: string; priority: number }[];

function toAbsoluteUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${cleanPath}`;
}

function cleanRoutePath(routePath: string | null, fallbackSlug: string) {
  const trimmedRoutePath = routePath?.trim() ?? "";
  const path = trimmedRoutePath || `/${fallbackSlug}`;

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      return url.hostname === "reconimports.com" ? url.pathname : "";
    } catch {
      return "";
    }
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function addEntry(entries: Map<string, MetadataRoute.Sitemap[number]>, entry: MetadataRoute.Sitemap[number]) {
  if (!entries.has(entry.url)) {
    entries.set(entry.url, entry);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  staticRoutes.forEach((route) => {
    addEntry(entries, {
      changeFrequency: route.path === "/" ? "daily" : "weekly",
      lastModified: now,
      priority: route.priority,
      url: toAbsoluteUrl(route.path),
    });
  });

  try {
    const [cars, brands, categories] = await Promise.all([
      prisma.car.findMany({
        select: {
          slug: true,
          stockType: true,
          updatedAt: true,
        },
        where: {
          isPublished: true,
          saleStatus: {
            not: CarSaleStatus.SOLD,
          },
        },
      }),
      prisma.brand.findMany({
        select: {
          slug: true,
          updatedAt: true,
        },
        where: { isActive: true },
      }),
      prisma.vehicleCategory.findMany({
        select: {
          routePath: true,
          slug: true,
          updatedAt: true,
        },
        where: { isActive: true },
      }),
    ]);

    cars.forEach((car) => {
      addEntry(entries, {
        changeFrequency: "weekly",
        lastModified: car.updatedAt,
        priority: 0.85,
        url: toAbsoluteUrl(getCarPublicPath({ slug: car.slug, stockType: car.stockType })),
      });
    });

    brands.forEach((brand) => {
      if (brand.slug === "ev") return;

      addEntry(entries, {
        changeFrequency: "weekly",
        lastModified: brand.updatedAt,
        priority: 0.7,
        url: toAbsoluteUrl(`/${brand.slug}`),
      });
    });

    categories.forEach((category) => {
      const routePath = cleanRoutePath(category.routePath, category.slug);

      if (!routePath || routePath === "/ev" || category.slug === "ev") return;

      addEntry(entries, {
        changeFrequency: "weekly",
        lastModified: category.updatedAt,
        priority: 0.7,
        url: toAbsoluteUrl(routePath),
      });
    });
  } catch (error) {
    console.error("Failed to load dynamic sitemap entries.", error);
  }

  return Array.from(entries.values());
}
