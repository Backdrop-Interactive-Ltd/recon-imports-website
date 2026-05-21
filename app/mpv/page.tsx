import PublicStockListing from "../car-stocks/PublicStockListing";

export const revalidate = 60;

export default function MpvPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="MPV"
      introCopy="Browse MPV vehicles uploaded with MPV selected as the body type."
      title="MPV Vehicles"
    />
  );
}
