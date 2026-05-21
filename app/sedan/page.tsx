import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function SedanPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Sedan"
      introCopy="Browse sedan vehicles uploaded with Sedan selected as the body type."
      title="Sedan Vehicles"
    />
  );
}
