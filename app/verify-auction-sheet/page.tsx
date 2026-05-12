"use client";

import { Check, Info, Search } from "lucide-react";
import { useMemo, useState } from "react";

// Fixed auction sheet verification fee shown in the checkout and order summary.
const reportFee = 800;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN").format(amount);
}

export default function VerifyAuctionSheetPage() {
  const [chassis, setChassis] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);

  const canProceed = useMemo(() => {
    return chassis.trim() && name.trim() && phone.trim() && email.trim() && agreed;
  }, [agreed, chassis, email, name, phone]);

  return (
    <main className="verify-page">
      {/* Header: car-stocks style navigation with this page marked as active. */}
      <header className="cars-header verify-page-header">
        <a className="cars-logo" href="/">
          <img src="/recon-logo.webp" alt="Recon Imports" />
        </a>
        <nav aria-label="Verify auction sheet navigation">
          <a href="/">Home</a>
          <a href="/car-stocks">
            Car Stocks
          </a>
          <a href="/pre-owned">
            Pre-Owned
          </a>
          <a href="/reconditioned">Reconditioned</a>
          <a className="active" href="/verify-auction-sheet">
            Verify Auction Sheet
          </a>
        </nav>
      </header>

      {/* Main form layout: left column has lookup and checkout, right column has order summary. */}
      <section className="verify-order-layout" aria-label="Verify auction sheet order form">
        <div className="verify-form-stack">
          {/* Vehicle lookup: user enters the chassis number before ordering the report. */}
          <section className="verify-panel lookup-panel">
            <h1>Vehicle Lookup</h1>
            <div className="lookup-row">
              <input
                value={chassis}
                onChange={(event) => setChassis(event.target.value)}
                placeholder="Enter Chassis Number"
                aria-label="Enter Chassis Number"
              />
              <button type="button">
                <Search size={19} />
                Search
              </button>
            </div>
            <p className="lookup-help">
              <Info size={15} />
              <span>
                To verify auction sheet, please enter your chassis number.
                <br />
                (Example: NZE141-6048723)
              </span>
            </p>
          </section>

          {/* Checkout form: customer details, payment selection, and terms agreement. */}
          <section className="verify-panel checkout-panel">
            <div className="step-heading">
              <span>1</span>
              <h2>Your Information</h2>
            </div>

            <div className="field-stack">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone Number" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
            </div>

            <div className="step-heading payment-heading">
              <span>2</span>
              <h2>Payment</h2>
            </div>

            <div className="payment-option">
              <span>Pay BDT {formatCurrency(reportFee)}</span>
              <span className="payment-marks" aria-label="Accepted card payment methods">
                <span className="card-mark mastercard" />
                <span>VISA</span>
                <span className="card-mark amex" />
              </span>
            </div>

            <button className="payment-button" type="button" disabled={!canProceed}>
              Proceed to Payment
            </button>

            <label className="terms-row">
              <input checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" />
              <span>I agree to the Terms & Conditions and understand that the report fee is non-refundable.</span>
            </label>
          </section>
        </div>

        {/* Order summary: fee total and deliverables for the auction sheet report. */}
        <aside className="order-summary" aria-label="Order summary">
          <h2>Order Summary</h2>
          <div className="summary-card">
            <div>
              <span>Auction Report Fee</span>
              <strong>BDT {formatCurrency(reportFee)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>BDT {formatCurrency(reportFee)}</strong>
            </div>
          </div>

          <div className="benefits-card">
            <h3>What You'll Get</h3>
            <ul>
              <li>
                <Check size={14} />
                Complete auction sheet with all details
              </li>
              <li>
                <Check size={14} />
                High-resolution auction images
              </li>
              <li>
                <Check size={14} />
                Verified vehicle history
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {/* Footer: dark wave footer with current site links, newsletter signup, and social channels. */}
      <footer className="footer verify-footer">
        <div className="footer-main">
          <div className="footer-column">
            <h3>Vehicles</h3>
            <button type="button">Sedan</button>
            <button type="button">SUV</button>
            <button type="button">Crossover</button>
            <button type="button">Wagon</button>
          </div>
          <div className="footer-column">
            <h3>Support</h3>
            <button type="button">Contact us</button>
            <button type="button">FAQs & support</button>
            <button type="button">Terms & conditions</button>
            <button type="button">After-sales</button>
          </div>
          <div className="footer-column">
            <h3>Reliant Motors</h3>
            <button type="button">About us</button>
            <a href="/car-stocks">Car Stocks</a>
            <a href="/verify-auction-sheet">Verify Auction Sheet</a>
          </div>
          <div className="footer-newsletter">
            <h3>Stay updated with Reliant Motors</h3>
            <label>
              <input placeholder="Your Email Address" type="email" />
              <button type="button">Subscribe</button>
            </label>
            <div className="social-links" aria-label="Social links">
              <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">IG</a>
              <a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noreferrer">FB</a>
              <a href="https://www.youtube.com/" aria-label="YouTube" target="_blank" rel="noreferrer">YT</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <strong>
            &copy; 2026 Reliant Motors. All Rights Reserved by{" "}
            <a className="footer-credit" href="https://backdropinteractive.com/" target="_blank" rel="noreferrer">
              @Backdrop Interactive
            </a>
          </strong>
          <nav aria-label="Footer legal links">
            <button type="button">Terms of Service</button>
            <button type="button">Privacy Policy</button>
            <button type="button">Terms & conditions</button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
