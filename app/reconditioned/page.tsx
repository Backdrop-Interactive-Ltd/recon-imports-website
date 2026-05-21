import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function ReconditionedPage() {
  return (
    <PublicStockListing
      activePage="reconditioned"
      title="Reconditioned Vehicles"
      introCopy="Explore reconditioned Japanese vehicles prepared for buyers who want fresh condition and dependable long-term ownership."
      typeFilter="Reconditioned"
    />
  );
}
