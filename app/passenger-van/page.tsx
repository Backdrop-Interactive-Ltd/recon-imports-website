import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function PassengerVanPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Passenger Van"
      introCopy="Browse passenger van vehicles uploaded with Passenger Van selected as the body type."
      title="Passenger Van Vehicles"
    />
  );
}
