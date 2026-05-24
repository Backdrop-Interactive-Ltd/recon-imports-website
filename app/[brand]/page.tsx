import { notFound } from "next/navigation";
import PublicStockListing from "../car-stocks/PublicStockListing";
import { getPublicBrandBySlug, getPublicBrandStaticParams } from "../car-stocks/data";
import { createPublicMetadata } from "../../lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  return getPublicBrandStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: slug } = await params;

  if (slug === "ev") {
    notFound();
  }

  const brand = await getPublicBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  return createPublicMetadata({
    description: `Browse ${brand.name} cars in Bangladesh from Recon Imports. View available Japanese car stock, prices, images, specifications, and vehicle details.`,
    image: brand.logoUrl,
    path: `/${brand.slug}`,
    title: `${brand.name} Cars in Bangladesh | Recon Imports`,
  });
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
      canonicalPath={`/${brand.slug}`}
      introCopy={`Browse vehicles uploaded with ${brand.name} selected as the car brand.`}
      title={`${brand.name} Vehicles`}
    />
  );
}
