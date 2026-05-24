import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Browse Japanese passenger vans in Bangladesh from Recon Imports with available stock, pricing, specifications, and import support.",
  path: "/passenger-van",
  title: "Passenger Van in Bangladesh | Recon Imports",
});

export default function PassengerVanPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Passenger Van"
      canonicalPath="/passenger-van"
      introCopy="Browse passenger van vehicles uploaded with Passenger Van selected as the body type."
      title="Passenger Van Vehicles"
    />
  );
}
