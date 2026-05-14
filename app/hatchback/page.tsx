import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function HatchbackPage() {
  return (
    <PublicStockListing
      activePage="car-stocks"
      bodyFilter="Hatchback"
      introCopy="Browse hatchback vehicles uploaded with Hatchback selected as the body type."
      title="Hatchback Vehicles"
    />
  );
}
