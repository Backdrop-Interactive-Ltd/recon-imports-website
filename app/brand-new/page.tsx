import PublicStockListing from "../car-stocks/PublicStockListing";

export const revalidate = 60;

export default function BrandNewPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      title="Brand New Vehicles"
      introCopy="Browse brand new vehicles uploaded from the admin inventory. Only vehicles marked as Brand New appear here."
      typeFilter="Brand New"
    />
  );
}
