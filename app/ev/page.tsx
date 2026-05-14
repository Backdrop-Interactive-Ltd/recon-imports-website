import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function EvPage() {
  return (
    <PublicStockListing
      activePage="ev"
      evOnly
      title="EVs"
      introCopy="Browse electric vehicles selected for efficient, quiet, and future-ready driving. EV units also remain visible in the full Car Stocks page."
    />
  );
}
