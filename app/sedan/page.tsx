import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Browse sedan cars in Bangladesh from Recon Imports. Check available Japanese sedan stock, specifications, prices, and images.",
  path: "/sedan",
  title: "Sedan Cars in Bangladesh | Recon Imports",
});

export default function SedanPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Sedan"
      canonicalPath="/sedan"
      introCopy="Browse sedan vehicles uploaded with Sedan selected as the body type."
      title="Sedan Vehicles"
    />
  );
}
