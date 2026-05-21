import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function PreOrderPage() {
  return (
    <PublicStockListing
      activePage="pre-order"
      title="Pre-Order Vehicles"
      introCopy="Browse vehicles available for pre-order. Any vehicle uploaded with the Pre Order type appears here."
      typeFilter="Pre Order"
    />
  );
}
