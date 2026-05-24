import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Browse quality pre-owned cars in Bangladesh from Recon Imports. Check available stock, specifications, prices, and vehicle details.",
  path: "/pre-owned",
  title: "Pre-Owned Cars in Bangladesh | Recon Imports",
});

export default function PreOwnedPage() {
  return (
    <PublicStockListing
      activePage="pre-owned"
      canonicalPath="/pre-owned"
      title="Pre-Owned Vehicles"
      introCopy="Browse imported pre-owned vehicles selected for quality, condition, and value."
      typeFilter="Pre Owned"
    />
  );
}
