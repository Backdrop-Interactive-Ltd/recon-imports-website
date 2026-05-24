import PublicCarDetailPage from "../../components/PublicCarDetailPage";
import { getPublicCarStaticParams } from "../../car-stocks/data";
import { generatePublicProductMetadata } from "../../car-stocks/productMetadata";

export const revalidate = 60;

export async function generateStaticParams() {
  return getPublicCarStaticParams("PRE_ORDER");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return generatePublicProductMetadata(params, { href: "/pre-order", label: "Pre-Order" });
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicCarDetailPage params={params} section={{ href: "/pre-order", label: "Pre-Order" }} />;
}
