"use client";

import { useState } from "react";

type FooterProps = {
  className?: string;
};

// Shared site footer used across all public pages.
export default function Footer({ className = "" }: FooterProps) {
  const [newsletter, setNewsletter] = useState("");
  const footerClassName = ["footer", className].filter(Boolean).join(" ");

  return (
    <footer className={footerClassName}>
      <div className="footer-main">
        <div className="footer-column">
          <h3>Vehicles</h3>
          <button type="button">SUV</button>
          <button type="button">Sedan</button>
          <button type="button">Wagon</button>
          <button type="button">Crossover</button>
          <button type="button">Passenger Van</button>
        </div>
        <div className="footer-column">
          <h3>Support</h3>
          <button type="button">About Us</button>
          <button type="button">Privacy Policy</button>
          <button type="button">FAQ's & support</button>
          <button type="button">Import Regulations</button>
          <button type="button">Terms & conditions</button>
        </div>
        <div className="footer-column">
          <h3>Recon Imports</h3>
          <a href="/car-stocks">Car Stocks</a>
          <a href="/sell-your-car">Sell Your Car</a>
          <a href="/car-stocks">Download Stock List</a>
          <a href="/send-requirements">Send Your Requirements</a>
          <a href="/verify-auction-sheet">Verify Car Auction Sheet</a>
        </div>
        <div className="footer-newsletter">
          <h3>Stay updated with Recon Imports</h3>
          <label>
            <input
              value={newsletter}
              onChange={(event) => setNewsletter(event.target.value)}
              placeholder="Your Email Address"
              type="email"
              suppressHydrationWarning
            />
            <button type="button">Subscribe</button>
          </label>
          <div className="social-links" aria-label="Social links">
            <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">
              IG
            </a>
            <a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noreferrer">
              FB
            </a>
            <a href="https://www.youtube.com/" aria-label="YouTube" target="_blank" rel="noreferrer">
              YT
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <strong>
          &copy; 2026 Recon Imports. All Rights Reserved by{" "}
          <a className="footer-credit" href="https://backdropinteractive.com/" target="_blank" rel="noreferrer">
            @Backdrop Interactive
          </a>
        </strong>
      </div>
    </footer>
  );
}
