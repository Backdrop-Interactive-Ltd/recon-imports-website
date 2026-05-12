import StockListingPage from "../car-stocks/StockListingPage";

export default function PreOwnedPage() {
  return (
    <StockListingPage
      activePage="pre-owned"
      title="Pre-Owned Vehicles"
      introCopy="Browse imported pre-owned vehicles selected for quality, condition, and value. Every pre-owned unit also remains visible in the full Car Stocks page."
      typeFilter="Pre Owned"
    />
  );
}
