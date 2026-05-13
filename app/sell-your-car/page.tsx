export default function SellYourCarPage() {
  return (
    <main className="send-requirements-page">
      <header className="cars-header send-requirements-header">
        <a className="cars-logo" href="/">
          <img src="/recon-logo.webp" alt="Recon Imports" />
        </a>
        <nav aria-label="Sell your car navigation">
          <a href="/">Home</a>
          <a href="/car-stocks">Car Stocks</a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/ev">EVS</a>
          <a href="/pre-owned">Pre-Owner</a>
          <a href="/pre-order">Pre-Order</a>
          <a href="/send-requirements">Send Requirements</a>
        </nav>
      </header>

      <section className="sell-car-section" aria-label="Sell your car form">
        <div className="sell-car-copy">
          <h1>
            Got A Car
            <span>You Need To Sell?</span>
          </h1>
          <p>
            Selling off your vehicle has never been this effortless. From the moment you arrive, every step is handled
            with care-no stress, no pressure, just honest guidance and clarity. We take care of the paperwork and offer
            a fair value, ensuring everything feels effortless and secure. It's a simple, safe way to pass your car into
            good hands, and walk away with confidence and peace of mind.
          </p>
        </div>

        <form className="sell-car-form">
          <h2>Ready to sell your car?</h2>
          <input placeholder="Your Name:" type="text" />
          <input placeholder="Your Phone Number:" type="tel" />
          <input placeholder="Car Name:" type="text" />
          <div className="sell-form-grid">
            <input placeholder="Model" type="text" />
            <input placeholder="Reg. Year" type="text" />
            <input placeholder="Mileage" type="text" />
          </div>
          <input placeholder="Offered Price" type="text" />
          <label className="upload-car-images">
            <input multiple type="file" accept="image/*" />
            <span>Upload Car Images</span>
          </label>
          <label className="sell-terms-row">
            <input type="checkbox" />
            <span>
              I accept and agree to the <a href="#">Terms Of Use</a>
            </span>
          </label>
          <button className="sell-submit" type="button">
            Submit
          </button>
          <a className="sell-whatsapp" href="https://wa.me/8801886589009" target="_blank" rel="noreferrer">
            Need More Details? Whatsapp
          </a>
        </form>
      </section>

      <footer className="footer send-requirements-footer">
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
              <input placeholder="Your Email Address" type="email" />
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
    </main>
  );
}
