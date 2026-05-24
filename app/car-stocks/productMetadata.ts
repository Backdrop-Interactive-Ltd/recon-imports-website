import { notFound } from "next/navigation";
import { getCarPublicPath } from "../../lib/carPublicRoutes";
import { createPublicMetadata } from "../../lib/seo";
import type { CarInventoryItem } from "./inventory";
import { getPublicCarDetail } from "./data";

type ProductSection = {
  href: "/brand-new" | "/reconditioned" | "/pre-owned" | "/pre-order";
  label: string;
};

function includesText(source: string, value: string) {
  return source.toLowerCase().includes(value.toLowerCase());
}

function getProductSeoTitle(product: CarInventoryItem) {
  const hasBrand = includesText(product.name, product.brand);
  const hasYear = includesText(product.name, product.year);

  if (hasBrand && hasYear) {
    return `${product.name} | Recon Imports`;
  }

  return `${[hasYear ? "" : product.year, hasBrand ? "" : product.brand, product.name].filter(Boolean).join(" ")} | Recon Imports`;
}

function getProductSeoSubject(product: CarInventoryItem) {
  const hasBrand = includesText(product.name, product.brand);
  const hasYear = includesText(product.name, product.year);

  return [hasYear ? "" : product.year, hasBrand ? "" : product.brand, product.name].filter(Boolean).join(" ");
}

function getProductSeoDescription(product: CarInventoryItem) {
  const productName = getProductSeoSubject(product);
  const details = [
    product.price ? "price" : "",
    product.mileage ? "mileage" : "",
    product.grade ? `auction grade ${product.grade}` : "auction grade",
    "images",
    "features",
    product.fuel ? product.fuel.toLowerCase() : "",
    product.transmission ? product.transmission.toLowerCase() : "",
    product.type ? product.type.toLowerCase() : "",
    "specifications",
  ].filter(Boolean);

  return `View ${productName} ${details.join(", ")} from Recon Imports Bangladesh.`;
}

export async function generatePublicProductMetadata(
  params: Promise<{ slug: string }>,
  section: ProductSection,
) {
  const { slug } = await params;
  const detail = await getPublicCarDetail(slug);

  if (!detail) {
    notFound();
  }

  const product = detail.product;
  const productPath = product.publicPath ?? getCarPublicPath({ id: product.id, type: product.type });

  if (productPath !== `${section.href}/${slug}`) {
    notFound();
  }

  return createPublicMetadata({
    description: getProductSeoDescription(product),
    image: product.hero,
    path: productPath,
    title: getProductSeoTitle(product),
  });
}
