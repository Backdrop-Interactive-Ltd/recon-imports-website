import StockListingPage from "../car-stocks/StockListingPage";

export default function CrossoverPage() {
  return (
    <StockListingPage
      activePage="car-stocks"
      bodyFilter="Crossover"
      introCopy="Browse crossover vehicles uploaded with Crossover selected as the body type."
      title="Crossover Vehicles"
    />
  );
}
