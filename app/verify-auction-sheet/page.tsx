import Footer from "../components/Footer";
import VerifyAuctionSheetForm from "./VerifyAuctionSheetForm";

export default function VerifyAuctionSheetPage() {
  return (
    <main className="verify-page">
      <header className="cars-header verify-page-header">
        <a className="cars-logo" href="/">
          <img src="/recon-logo.webp" alt="Recon Imports" />
        </a>
        <nav aria-label="Verify auction sheet navigation">
          <a href="/">Home</a>
          <a href="/car-stocks">Car Stocks</a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/ev">EVS</a>
          <a href="/pre-owned">Pre-Owner</a>
          <a href="/pre-order">Pre-Order</a>
          <a href="/send-requirements">Send Requirements</a>
        </nav>
      </header>

      <VerifyAuctionSheetForm />

      <Footer className="verify-footer" />
    </main>
  );
}
