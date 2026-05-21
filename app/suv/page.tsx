import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function SuvPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="SUV"
      introCopy="Browse SUV vehicles uploaded with SUV selected as the body type."
      title="SUV Vehicles"
    />
  );
}
