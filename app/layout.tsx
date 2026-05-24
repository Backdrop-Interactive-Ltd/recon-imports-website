import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import BfcacheRestore from "./components/BfcacheRestore";
import { getSiteSettings } from "../lib/siteSettings";
import { createHomepageMetadata } from "../lib/seo";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const metadata = createHomepageMetadata(settings);

  return {
    ...metadata,
    applicationName: "Recon Imports",
    icons: settings.favicon ? { icon: [{ url: settings.favicon }] } : undefined,
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
