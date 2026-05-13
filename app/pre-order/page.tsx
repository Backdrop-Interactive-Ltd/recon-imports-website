import StockListingPage from "../car-stocks/StockListingPage";

export default function PreOrderPage() {
  return (
    <StockListingPage
      activePage="pre-order"
      title="Pre-Order Vehicles"
      introCopy="Browse vehicles available for pre-order. Any vehicle uploaded with the Pre Order type appears here and also remains visible in the full Car Stocks page."
      typeFilter="Pre Order"
    />
  );
}
