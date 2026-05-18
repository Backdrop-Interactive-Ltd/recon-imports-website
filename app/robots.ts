import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        allow: "/",
        disallow: ["/admin", "/api"],
        userAgent: "*",
      },
      {
        allow: "/",
        disallow: ["/admin", "/api"],
        userAgent: "facebookexternalhit",
      },
      {
        allow: "/",
        disallow: ["/admin", "/api"],
        userAgent: "Facebot",
      },
    ],
    sitemap: "https://reconimports.com/sitemap.xml",
  };
}
