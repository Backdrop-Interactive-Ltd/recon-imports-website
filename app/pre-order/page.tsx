import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Pre-order Japanese cars through Recon Imports with reliable vehicle sourcing, import support, and complete guidance in Bangladesh.",
  path: "/pre-order",
  title: "Pre-Order Japanese Cars in Bangladesh | Recon Imports",
});

export default function PreOrderPage() {
  return (
    <PublicStockListing
      activePage="pre-order"
      canonicalPath="/pre-order"
      title="Pre-Order Vehicles"
      introCopy="Browse vehicles available for pre-order. Any vehicle uploaded with the Pre Order type appears here."
      typeFilter="Pre Order"
    />
  );
}
