import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function MpvPage() {
  return (
    <PublicStockListing
      activePage="car-stocks"
      bodyFilter="MPV"
      introCopy="Browse MPV vehicles uploaded with MPV selected as the body type."
      title="MPV Vehicles"
    />
  );
}
