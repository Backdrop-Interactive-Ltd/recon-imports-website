import StockListingPage, { type StockListingPageProps } from "./StockListingPage";
import { getPublicStockData } from "./data";

export default async function PublicStockListing(props: StockListingPageProps) {
  const stockData = await getPublicStockData();

  return <StockListingPage {...props} availableBrands={stockData.brands} inventoryItems={stockData.cars} />;
}
