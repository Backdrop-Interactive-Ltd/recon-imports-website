import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { CSSProperties } from "react";
import { getSiteSettings } from "../lib/siteSettings";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    description: settings.defaultMetaDescription,
    icons: settings.favicon ? { icon: [{ url: settings.favicon }] } : undefined,
    openGraph: {
      description: settings.defaultMetaDescription,
      images: settings.openGraphImage ? [{ url: settings.openGraphImage }] : undefined,
      title: settings.defaultMetaTitle,
    },
    title: settings.defaultMetaTitle,
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
