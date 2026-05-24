import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Explore brand new Japanese cars from Recon Imports. Browse available stock, prices, specifications, and import support in Bangladesh.",
  path: "/brand-new",
  title: "Brand New Japanese Cars in Bangladesh | Recon Imports",
});

export default function BrandNewPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      canonicalPath="/brand-new"
      title="Brand New Vehicles"
      introCopy="Browse brand new vehicles uploaded from the admin inventory. Only vehicles marked as Brand New appear here."
      typeFilter="Brand New"
    />
  );
}
