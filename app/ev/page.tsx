import StockListingPage from "../car-stocks/StockListingPage";

export default function EvPage() {
  return (
    <StockListingPage
      activePage="ev"
      evOnly
      title="EVs"
      introCopy="Browse electric vehicles selected for efficient, quiet, and future-ready driving. EV units also remain visible in the full Car Stocks page."
    />
  );
}
