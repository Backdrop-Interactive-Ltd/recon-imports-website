import type { Metadata } from "next";
import { getOpenGraphImageUrl } from "./cloudinaryImages";
import type { PublicSiteSettings } from "./siteSettingsConfig";

export const siteUrl = "https://reconimports.com";
export const defaultMetaTitle = "Recon Imports | Premium Japanese Reconditioned Cars in Bangladesh";
export const defaultMetaDescription =
  "Recon Imports offers premium Japanese reconditioned cars, verified auction sheet support, car stock listings, and reliable vehicle import services in Bangladesh.";
const defaultOpenGraphImage = `${siteUrl}/hero-slide-1.webp`;

type PublicMetadataInput = {
  description: string;
  image?: string | null;
  path: string;
  title: string;
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

type VehicleProductSchemaInput = {
  brand: string;
  bodyType?: string | null;
  condition?: string | null;
  description: string;
  fuelType: string;
  gallery: string[];
  grade?: string | null;
  mileage: string;
  model: string;
  name: string;
  path: string;
  price: number;
  saleStatus?: string | null;
  stockType?: string | null;
  transmission: string;
  year: string;
};

function cleanPath(path: string) {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function absoluteUrl(pathOrUrl?: string | null) {
  const value = pathOrUrl?.trim() ?? "";

  if (!value) {
    return siteUrl;
  }

  if (value.startsWith("/")) {
    return `${siteUrl}${value}`;
  }

  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    return `${siteUrl}/${value.replace(/^\/+/, "")}`;
  }

  return siteUrl;
}

export function cleanSeoText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue || /Reliant Motors/i.test(trimmedValue)) {
    return fallback;
  }

  return trimmedValue.replace(/Reliant Motors/gi, "Recon Imports");
}

function normalizeOgImage(image?: string | null) {
  const value = image?.trim() ?? "";

  if (!value) {
    return defaultOpenGraphImage;
  }

  return absoluteUrl(getOpenGraphImageUrl(value));
}

export function createPublicMetadata({ description, image, path, title }: PublicMetadataInput): Metadata {
  const canonicalPath = cleanPath(path);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const openGraphImage = normalizeOgImage(image);

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      description,
      images: [{ url: openGraphImage }],
      siteName: "Recon Imports",
      title,
      type: "website",
      url: canonicalUrl,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [openGraphImage],
      title,
    },
  };
}

export function createHomepageMetadata(settings: PublicSiteSettings): Metadata {
  return createPublicMetadata({
    description: cleanSeoText(settings.defaultMetaDescription, defaultMetaDescription),
    image: settings.openGraphImage,
    path: "/",
    title: cleanSeoText(settings.defaultMetaTitle, defaultMetaTitle),
  });
}

export function createBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: absoluteUrl(item.path),
      name: item.name,
      position: index + 1,
    })),
  };
}

export function createHomepageJsonLd(settings: PublicSiteSettings) {
  const name = cleanSeoText(settings.siteName, "Recon Imports");
  const logo = absoluteUrl(settings.websiteLogo || "/recon-logo.webp");
  const sameAs = [
    settings.facebookUrl,
    settings.instagramUrl,
    settings.youtubeUrl,
    settings.tiktokUrl,
    settings.linkedinUrl,
  ].filter(Boolean);

  return [
    {
      "@context": "https://schema.org",
      "@type": "AutoDealer",
      "@id": `${siteUrl}/#autodealer`,
      address: settings.address || undefined,
      email: settings.email || undefined,
      image: logo,
      logo,
      name,
      sameAs,
      telephone: settings.phoneNumber || undefined,
      url: siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      logo,
      name,
      sameAs,
      url: siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name,
      potentialAction: {
        "@type": "SearchAction",
        queryInput: "required name=search_term_string",
        target: `${siteUrl}/brand-new?q={search_term_string}`,
      },
      url: siteUrl,
    },
  ];
}

function parseMileage(mileage: string) {
  const value = Number(mileage.replace(/[^\d.]/g, ""));

  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function createVehicleProductJsonLd(vehicle: VehicleProductSchemaInput) {
  const images = Array.from(new Set(vehicle.gallery.map((image) => absoluteUrl(image)).filter(Boolean)));
  const mileageValue = parseMileage(vehicle.mileage);
  const availability = vehicle.saleStatus?.toLowerCase() === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock";
  const additionalProperty = [
    vehicle.stockType ? { "@type": "PropertyValue", name: "Stock Type", value: vehicle.stockType } : null,
    vehicle.grade ? { "@type": "PropertyValue", name: "Auction Grade", value: vehicle.grade } : null,
    vehicle.condition ? { "@type": "PropertyValue", name: "Condition", value: vehicle.condition } : null,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": ["Vehicle", "Product"],
    additionalProperty: additionalProperty.length > 0 ? additionalProperty : undefined,
    bodyType: vehicle.bodyType || undefined,
    brand: {
      "@type": "Brand",
      name: vehicle.brand,
    },
    description: vehicle.description,
    fuelType: vehicle.fuelType,
    image: images.length > 0 ? images : undefined,
    mileageFromOdometer: mileageValue
      ? {
          "@type": "QuantitativeValue",
          unitCode: "KMT",
          value: mileageValue,
        }
      : undefined,
    model: vehicle.model,
    name: vehicle.name,
    offers: {
      "@type": "Offer",
      availability,
      price: vehicle.price,
      priceCurrency: "BDT",
      url: absoluteUrl(vehicle.path),
    },
    productionDate: vehicle.year,
    url: absoluteUrl(vehicle.path),
    vehicleModelDate: vehicle.year,
    vehicleTransmission: vehicle.transmission,
  };
}
