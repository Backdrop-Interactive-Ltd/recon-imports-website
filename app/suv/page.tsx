import PublicStockListing from "../car-stocks/PublicStockListing";

export const revalidate = 60;

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
