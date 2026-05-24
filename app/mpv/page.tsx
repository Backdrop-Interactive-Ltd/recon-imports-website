import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Find MPV cars in Bangladesh from Recon Imports. Browse Japanese family cars with pricing, features, mileage, and specifications.",
  path: "/mpv",
  title: "MPV Cars in Bangladesh | Recon Imports",
});

export default function MpvPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="MPV"
      canonicalPath="/mpv"
      introCopy="Browse MPV vehicles uploaded with MPV selected as the body type."
      title="MPV Vehicles"
    />
  );
}
