import bundleAnalyzer from "@next/bundle-analyzer";
import { isolatedDistDir } from "./scripts/build-isolation.mjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  ...(process.env.RECON_WORKERS_BUILD === "1" ? {
    // The generated workerd client imports its PostgreSQL compiler from lib/.
    // Turbopack's broad WASM trace otherwise includes unused Prisma CLI/PGlite
    // and every database provider; OpenNext turns those traces into imports.
    outputFileTracingExcludes: { "*": [
      "./node_modules/@prisma/**/*.wasm",
      "./node_modules/prisma/**/*.wasm",
      "./node_modules/@electric-sql/**/*.wasm",
    ] },
  } : {}),
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
