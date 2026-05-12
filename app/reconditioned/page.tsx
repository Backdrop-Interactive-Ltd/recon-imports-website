import StockListingPage from "../car-stocks/StockListingPage";

export default function ReconditionedPage() {
  return (
    <StockListingPage
      activePage="reconditioned"
      title="Reconditioned Vehicles"
      introCopy="Explore reconditioned Japanese vehicles prepared for buyers who want fresh condition and dependable long-term ownership. Every reconditioned unit also appears in the full Car Stocks page."
      typeFilter="Reconditioned"
    />
  );
}
