import StockListingPage from "../car-stocks/StockListingPage";

export default function PassengerVanPage() {
  return (
    <StockListingPage
      activePage="car-stocks"
      bodyFilter="Passenger Van"
      introCopy="Browse passenger van vehicles uploaded with Passenger Van selected as the body type."
      title="Passenger Van Vehicles"
    />
  );
}
