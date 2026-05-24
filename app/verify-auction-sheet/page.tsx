import Footer from "../components/Footer";
import PublicLogoImage from "../components/PublicLogoImage";
import { getSiteSettings } from "../../lib/siteSettings";
import VerifyAuctionSheetForm from "./VerifyAuctionSheetForm";

export const dynamic = "force-dynamic";

export default async function VerifyAuctionSheetPage() {
  const siteSettings = await getSiteSettings();

  return (
    <main className="verify-page">
      <header className="cars-header verify-page-header">
        <a className="cars-logo" href="/">
          <PublicLogoImage
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={siteSettings.siteName}
            width={178}
            height={55}
            sizes="178px"
          />
        </a>
        <nav aria-label="Verify auction sheet navigation">
          <a href="/">Home</a>
          <a href="/brand-new">Brand New</a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/pre-owned">Pre-Owned</a>
          <a href="/pre-order">Pre-Order</a>
          <a href="/send-requirements">Send Requirements</a>
        </nav>
      </header>

      <VerifyAuctionSheetForm paymentAccounts={siteSettings} />

      <Footer className="verify-footer" settings={siteSettings} />
    </main>
  );
}
