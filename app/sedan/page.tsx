import StockListingPage from "../car-stocks/StockListingPage";

export default function SedanPage() {
  return (
    <StockListingPage
      activePage="car-stocks"
      bodyFilter="Sedan"
      introCopy="Browse sedan vehicles uploaded with Sedan selected as the body type."
      title="Sedan Vehicles"
    />
  );
}
