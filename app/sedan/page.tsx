import PublicStockListing from "../car-stocks/PublicStockListing";

export const revalidate = 60;

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
