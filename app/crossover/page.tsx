import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Explore crossover cars in Bangladesh from Recon Imports. View available Japanese crossover stock, prices, images, and details.",
  path: "/crossover",
  title: "Crossover Cars in Bangladesh | Recon Imports",
});

export default function CrossoverPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Crossover"
      canonicalPath="/crossover"
      introCopy="Browse crossover vehicles uploaded with Crossover selected as the body type."
      title="Crossover Vehicles"
    />
  );
}
