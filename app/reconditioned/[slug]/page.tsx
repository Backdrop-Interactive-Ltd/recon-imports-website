import PublicCarDetailPage from "../../components/PublicCarDetailPage";
import { getPublicCarStaticParams } from "../../car-stocks/data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicCarStaticParams("RECONDITIONED");
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicCarDetailPage params={params} section={{ href: "/reconditioned", label: "Reconditioned" }} />;
}
