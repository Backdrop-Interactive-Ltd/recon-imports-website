import PublicCarDetailPage from "../../components/PublicCarDetailPage";
import { getPublicCarStaticParams } from "../../car-stocks/data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicCarStaticParams("BRAND_NEW");
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicCarDetailPage params={params} section={{ href: "/brand-new", label: "Brand New" }} />;
}
