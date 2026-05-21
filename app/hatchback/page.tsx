import PublicStockListing from "../car-stocks/PublicStockListing";

export const revalidate = 60;

export default function HatchbackPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Hatchback"
      introCopy="Browse hatchback vehicles uploaded with Hatchback selected as the body type."
      title="Hatchback Vehicles"
    />
  );
}
