import { ArrowRight } from "lucide-react";

export default function VerifySection() {
  return (
    <section className="verify-section" id="verify">
      <div className="verify-card">
        <div className="verify-copy">
          <h2>Verify any auction sheet</h2>
          <p>
            At Recon Imports, our expert Auction Sheet Verification service helps you verify your vehicle's true
            history, condition, and mileage before you buy.
          </p>
        </div>
        <a className="verify-link" href="/verify-auction-sheet">
          Get Verified <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
