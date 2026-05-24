import PublicStockListing from "../car-stocks/PublicStockListing";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export const metadata = createPublicMetadata({
  description:
    "Find premium reconditioned Japanese cars in Bangladesh with verified details, images, pricing, and trusted support from Recon Imports.",
  path: "/reconditioned",
  title: "Reconditioned Japanese Cars in Bangladesh | Recon Imports",
});

export default function ReconditionedPage() {
  return (
    <PublicStockListing
      activePage="reconditioned"
      canonicalPath="/reconditioned"
      title="Reconditioned Vehicles"
      introCopy="Explore reconditioned Japanese vehicles prepared for buyers who want fresh condition and dependable long-term ownership."
      typeFilter="Reconditioned"
    />
  );
}
