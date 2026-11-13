import bundleAnalyzer from "@next/bundle-analyzer";
import { isolatedDistDir } from "./scripts/build-isolation.mjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.RECON_ISOLATED_BUILD ? { distDir: isolatedDistDir(process.env.RECON_ISOLATED_BUILD) } : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        hostname: "res.cloudinary.com",
        protocol: "https",
      },
    ],
  },
  async headers() {
    const privateHeaders = [
      {
        key: "Cache-Control",
        value: "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
      {
        key: "Pragma",
        value: "no-cache",
      },
      {
        key: "Expires",
        value: "0",
      },
    ];

    return [
      {
        source: "/admin",
        headers: privateHeaders,
      },
      {
        source: "/admin/:path*",
        headers: privateHeaders,
      },
      {
        source: "/api",
        headers: privateHeaders,
      },
      {
        source: "/api/:path*",
        headers: privateHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
