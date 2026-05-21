import PublicCarDetailPage from "../../components/PublicCarDetailPage";
import { getPublicCarStaticParams } from "../../car-stocks/data";

export const revalidate = 60;

export async function generateStaticParams() {
  return getPublicCarStaticParams("BRAND_NEW");
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicCarDetailPage params={params} section={{ href: "/brand-new", label: "Brand New" }} />;
}
