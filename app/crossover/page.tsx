import PublicStockListing from "../car-stocks/PublicStockListing";

export const revalidate = 60;

export default function CrossoverPage() {
  return (
    <PublicStockListing
      activePage="brand-new"
      bodyFilter="Crossover"
      introCopy="Browse crossover vehicles uploaded with Crossover selected as the body type."
      title="Crossover Vehicles"
    />
  );
}
