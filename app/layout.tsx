import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recon Imports",
  description: "Reconditioned and pre-owned vehicle showroom website.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
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
