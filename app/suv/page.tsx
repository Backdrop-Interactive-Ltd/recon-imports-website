import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Explore SUV cars in Bangladesh from Recon Imports. View Japanese SUV stock, prices, images, specifications, and vehicle details.",
  path: "/suv",
  title: "SUV Cars in Bangladesh | Recon Imports",
});

export default function SuvPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="SUV"
      canonicalPath="/suv"
      introCopy="Browse SUV vehicles uploaded with SUV selected as the body type."
      title="SUV Vehicles"
    />
  );
}
