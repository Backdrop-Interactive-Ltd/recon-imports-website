import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Explore hatchback cars in Bangladesh from Recon Imports. Browse Japanese hatchback stock, prices, images, and vehicle specifications.",
  path: "/hatchback",
  title: "Hatchback Cars in Bangladesh | Recon Imports",
});

export default function HatchbackPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Hatchback"
      canonicalPath="/hatchback"
      introCopy="Browse hatchback vehicles uploaded with Hatchback selected as the body type."
      title="Hatchback Vehicles"
    />
  );
}
