import StockListingPage, { type StockListingPageProps } from "./StockListingPage";
import { getPublicStockData } from "./data";
import { getSiteSettings } from "../../lib/siteSettings";

export default async function PublicStockListing(props: StockListingPageProps) {
  const [stockData, siteSettings] = await Promise.all([
    getPublicStockData({
      bodyFilter: props.bodyFilter,
      brandFilter: props.brandFilter,
      typeFilter: props.typeFilter,
    }),
    getSiteSettings(),
  ]);

  return (
    <StockListingPage
      {...props}
      availableBrands={stockData.brands}
      inventoryItems={stockData.cars}
      siteSettings={siteSettings}
    />
  );
}
