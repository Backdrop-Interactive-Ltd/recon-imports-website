import { notFound } from "next/navigation";
import { brandOptions, getBrandBySlug } from "../car-stocks/brands";
import StockListingPage from "../car-stocks/StockListingPage";

export function generateStaticParams() {
  return brandOptions.map((brand) => ({ brand: brand.slug }));
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: slug } = await params;
  const brand = getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  return (
    <StockListingPage
      activePage="car-stocks"
      brandFilter={brand.name}
      introCopy={`Browse vehicles uploaded with ${brand.name} selected as the car brand.`}
      title={`${brand.name} Vehicles`}
    />
  );
}
