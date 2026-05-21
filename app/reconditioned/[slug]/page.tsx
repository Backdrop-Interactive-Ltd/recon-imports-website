import PublicCarDetailPage from "../../components/PublicCarDetailPage";
import { getPublicCarStaticParams } from "../../car-stocks/data";

export const revalidate = 60;

export async function generateStaticParams() {
  return getPublicCarStaticParams("RECONDITIONED");
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicCarDetailPage params={params} section={{ href: "/reconditioned", label: "Reconditioned" }} />;
}
