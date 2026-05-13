import StockListingPage from "../car-stocks/StockListingPage";

export default function SuvPage() {
  return (
    <StockListingPage
      activePage="car-stocks"
      bodyFilter="SUV"
      introCopy="Browse SUV vehicles uploaded with SUV selected as the body type."
      title="SUV Vehicles"
    />
  );
}
