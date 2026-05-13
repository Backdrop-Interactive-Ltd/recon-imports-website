import StockListingPage from "../car-stocks/StockListingPage";

export default function HatchbackPage() {
  return (
    <StockListingPage
      activePage="car-stocks"
      bodyFilter="Hatchback"
      introCopy="Browse hatchback vehicles uploaded with Hatchback selected as the body type."
      title="Hatchback Vehicles"
    />
  );
}
