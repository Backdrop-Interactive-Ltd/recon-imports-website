import StockListingPage from "../car-stocks/StockListingPage";

export default function MpvPage() {
  return (
    <StockListingPage
      activePage="car-stocks"
      bodyFilter="MPV"
      introCopy="Browse MPV vehicles uploaded with MPV selected as the body type."
      title="MPV Vehicles"
    />
  );
}
