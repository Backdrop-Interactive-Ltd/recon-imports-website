import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { CSSProperties } from "react";
import { getSiteSettings } from "../lib/siteSettings";
import "./globals.css";

const siteUrl = "https://reconimports.com";
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = cleanSeoValue(settings.defaultMetaTitle, defaultMetaTitle);
  const description = cleanSeoValue(settings.defaultMetaDescription, defaultMetaDescription);

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
      images: settings.openGraphImage ? [{ url: settings.openGraphImage }] : undefined,
      siteName: "Recon Imports",
      title,
      type: "website",
      url: siteUrl,
    },
    title,
    twitter: {
      card: settings.openGraphImage ? "summary_large_image" : "summary",
      description,
      images: settings.openGraphImage ? [settings.openGraphImage] : undefined,
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
        <Script id="home-bfcache-restore" strategy="beforeInteractive">
          {`
            window.addEventListener("pageshow", function (event) {
              var navigationEntries = performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
              var navigationType = navigationEntries.length > 0 ? navigationEntries[0].type : "";

              if (window.location.pathname === "/" && (event.persisted || navigationType === "back_forward")) {
                window.location.reload();
              }
            });
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
