import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import BfcacheRestore from "./components/BfcacheRestore";
import { getSiteSettings } from "../lib/siteSettings";
import "./globals.css";

const siteUrl = "https://reconimports.com";
const defaultOpenGraphImage = `${siteUrl}/hero-slide-1.webp`;
const defaultMetaTitle = "Recon Imports | Premium Japanese Reconditioned Cars in Bangladesh";
const defaultMetaDescription =
  "Recon Imports offers Japanese reconditioned cars, car stocks, auction sheet verification, and vehicle import support in Bangladesh.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function cleanSeoValue(value: string, fallback: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || /Reliant Motors/i.test(trimmedValue)) {
    return fallback;
  }

  return trimmedValue;
}

function getPublicImageUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return defaultOpenGraphImage;
  }

  if (trimmedValue.startsWith("/")) {
    return `${siteUrl}${trimmedValue}`;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return defaultOpenGraphImage;
  }

  return defaultOpenGraphImage;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = cleanSeoValue(settings.defaultMetaTitle, defaultMetaTitle);
  const description = cleanSeoValue(settings.defaultMetaDescription, defaultMetaDescription);
  const openGraphImage = getPublicImageUrl(settings.openGraphImage);

  return {
    alternates: {
      canonical: siteUrl,
    },
    applicationName: "Recon Imports",
    description,
    icons: settings.favicon ? { icon: [{ url: settings.favicon }] } : undefined,
    metadataBase: new URL(siteUrl),
    openGraph: {
      description,
      images: [{ url: openGraphImage }],
      siteName: "Recon Imports",
      title,
      type: "website",
      url: siteUrl,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const themeStyle = {
    "--site-accent": settings.accentColor,
    "--site-primary": settings.primaryColor,
    "--site-secondary": settings.secondaryColor,
  } as CSSProperties;

  return (
    <html lang="en">
      <body style={themeStyle}>
        <BfcacheRestore />
        {children}
      </body>
    </html>
  );
}
