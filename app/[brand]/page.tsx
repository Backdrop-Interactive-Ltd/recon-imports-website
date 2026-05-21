import { notFound } from "next/navigation";
import PublicStockListing from "../car-stocks/PublicStockListing";
import { getPublicBrandBySlug, getPublicBrandStaticParams } from "../car-stocks/data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicBrandStaticParams();
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: slug } = await params;

  if (slug === "ev") {
    notFound();
  }

  const brand = await getPublicBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  return (
    <PublicStockListing
      activePage="brand-new"
      brandFilter={brand.name}
      introCopy={`Browse vehicles uploaded with ${brand.name} selected as the car brand.`}
      title={`${brand.name} Vehicles`}
    />
  );
}
