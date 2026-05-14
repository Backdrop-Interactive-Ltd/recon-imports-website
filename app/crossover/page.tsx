import PublicStockListing from "../car-stocks/PublicStockListing";

export const dynamic = "force-dynamic";

export default function CrossoverPage() {
  return (
    <PublicStockListing
      activePage="car-stocks"
      bodyFilter="Crossover"
      introCopy="Browse crossover vehicles uploaded with Crossover selected as the body type."
      title="Crossover Vehicles"
    />
  );
}
