import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function PreOwnedPage() {
  return (
    <PublicStockListing
      activePage="pre-owned"
      title="Pre-Owned Vehicles"
      introCopy="Browse imported pre-owned vehicles selected for quality, condition, and value."
      typeFilter="Pre Owned"
    />
  );
}
