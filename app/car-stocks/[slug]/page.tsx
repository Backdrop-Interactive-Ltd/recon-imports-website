import { Download, MessageCircle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import ShareButton from "./ShareButton";
import SuggestedCarousel from "./SuggestedCarousel";

const products = [
  {
    slug: "toyota-alphard",
    name: "Toyota Alphard",
    brand: "Toyota",
    model: "2024",
    regYear: "2024",
    mileage: "8k KM",
    engine: "2500",
    transmission: "AUTOMATIC",
    fuel: "OCTANE+HYBRID",
    drive: "AWD",
    wheel: "19 inch",
    exterior: "Bronze",
    body: "Minivan / MPV",
    price: "BDT 1,69,00,000",
    hero: "/stock-noah-2023.webp",
    gallery: ["/stock-noah-2023.webp", "/cat-mpv.webp", "/stock-noah-pearl.webp", "/stock-noah-black.webp", "/cat-crossover.webp"],
  },
  {
    slug: "land-cruiser-lc300",
    name: "Land Cruiser LC300 ZX",
    brand: "Toyota",
    model: "2022",
    regYear: "2022",
    mileage: "23k KM",
    engine: "3500",
    transmission: "AUTOMATIC",
    fuel: "OCTANE",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "Pearl White",
    body: "SUV",
    price: "BDT 3,79,00,000",
    hero: "/stock-noah-2023.webp",
    gallery: ["/stock-noah-2023.webp", "/cat-suv.webp", "/stock-noah-white.webp", "/stock-noah-pearl.webp", "/cat-crossover.webp"],
  },
  {
    slug: "bmw-x7-blue",
    name: "BMW X7",
    brand: "BMW",
    model: "2021",
    regYear: "2021",
    mileage: "15k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    fuel: "OCTANE",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "Blue",
    body: "SUV",
    price: "BDT 2,79,00,000",
    hero: "/cat-mpv.webp",
    gallery: ["/cat-mpv.webp", "/cat-crossover.webp", "/stock-noah-black.webp", "/stock-noah-pearl.webp", "/cat-wagon.webp"],
  },
  {
    slug: "bmw-x7-black",
    name: "BMW X7 Xdrive40i M-Sport",
    brand: "BMW",
    model: "2022",
    regYear: "2022",
    mileage: "15k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    fuel: "OCTANE",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "Black",
    body: "SUV",
    price: "BDT 2,69,00,000",
    hero: "/cat-crossover.webp",
    gallery: ["/cat-crossover.webp", "/cat-mpv.webp", "/stock-noah-black.webp", "/stock-noah-white.webp", "/cat-suv.webp"],
  },
  {
    slug: "range-rover-2020",
    name: "Range Rover Vogue Autobiography",
    brand: "Range Rover",
    model: "2020",
    regYear: "2020",
    mileage: "5k Miles",
    engine: "3000",
    transmission: "AUTOMATIC",
    fuel: "OCTANE",
    drive: "AWD",
    wheel: "22 inch",
    exterior: "White",
    body: "SUV",
    price: "BDT 2,49,00,000",
    hero: "/cat-wagon.webp",
    gallery: ["/cat-wagon.webp", "/cat-suv.webp", "/stock-axio.webp", "/cat-crossover.webp", "/stock-noah-white.webp"],
  },
  {
    slug: "range-rover-2019",
    name: "Range Rover Vogue Autobiography",
    brand: "Range Rover",
    model: "2019",
    regYear: "2019",
    mileage: "14k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    fuel: "OCTANE",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "White",
    body: "SUV",
    price: "BDT 2,19,00,000",
    hero: "/stock-axio.webp",
    gallery: ["/stock-axio.webp", "/cat-wagon.webp", "/stock-noah-white.webp", "/cat-suv.webp", "/cat-crossover.webp"],
  },
  {
    slug: "mercedes-s560e",
    name: "Mercedes-Benz S 560e",
    brand: "Mercedes-Benz",
    model: "2019",
    regYear: "2019",
    mileage: "11k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    fuel: "OCTANE HYBRID",
    drive: "RWD",
    wheel: "20 inch",
    exterior: "Black",
    body: "Sedan",
    price: "BDT 1,89,00,000",
    hero: "/stock-noah-black.webp",
    gallery: ["/stock-noah-black.webp", "/stock-noah-pearl.webp", "/stock-axio.webp", "/cat-crossover.webp", "/cat-mpv.webp"],
  },
  {
    slug: "land-cruiser-zx-v8",
    name: "Land Cruiser Zx-V8",
    brand: "Toyota",
    model: "2015",
    regYear: "2015",
    mileage: "71k KM",
    engine: "4600",
    transmission: "AUTOMATIC",
    fuel: "OCTANE",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "White",
    body: "SUV",
    price: "BDT 1,89,00,000",
    hero: "/stock-noah-white.webp",
    gallery: ["/stock-noah-white.webp", "/cat-suv.webp", "/cat-crossover.webp", "/stock-noah-2023.webp", "/cat-wagon.webp"],
  },
  {
    slug: "bmw-745le",
    name: "BMW 745Le",
    brand: "BMW",
    model: "2019",
    regYear: "2019",
    mileage: "15k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    fuel: "OCTANE HYBRID",
    drive: "RWD",
    wheel: "20 inch",
    exterior: "Pearl",
    body: "Sedan",
    price: "BDT 1,89,00,000",
    hero: "/stock-noah-pearl.webp",
    gallery: ["/stock-noah-pearl.webp", "/stock-noah-black.webp", "/cat-crossover.webp", "/stock-axio.webp", "/cat-mpv.webp"],
  },
  {
    slug: "land-cruiser-vx-2016",
    name: "Land Cruiser Vx-V8",
    brand: "Toyota",
    model: "2016",
    regYear: "2016",
    mileage: "41k KM",
    engine: "4600",
    transmission: "AUTOMATIC",
    fuel: "DIESEL",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "White",
    body: "SUV",
    price: "BDT 1,69,00,000",
    hero: "/cat-suv.webp",
    gallery: ["/cat-suv.webp", "/stock-noah-white.webp", "/cat-crossover.webp", "/cat-wagon.webp", "/stock-noah-2023.webp"],
  },
  {
    slug: "land-cruiser-vx-2015",
    name: "Land Cruiser Vx-V8",
    brand: "Toyota",
    model: "2015",
    regYear: "2015",
    mileage: "74k KM",
    engine: "4600",
    transmission: "AUTOMATIC",
    fuel: "DIESEL",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "Black",
    body: "SUV",
    price: "BDT 1,59,00,000",
    hero: "/cat-crossover.webp",
    gallery: ["/cat-crossover.webp", "/cat-suv.webp", "/stock-noah-black.webp", "/stock-noah-white.webp", "/cat-wagon.webp"],
  },
  {
    slug: "lexus-rx500h",
    name: "Lexus RX 500h Turbo",
    brand: "Lexus",
    model: "2023",
    regYear: "2023",
    mileage: "22k KM",
    engine: "2400",
    transmission: "AUTOMATIC",
    fuel: "OCTANE HYBRID",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "Red",
    body: "Crossover",
    price: "BDT 1,49,00,000",
    hero: "/stock-axio.webp",
    gallery: ["/stock-axio.webp", "/cat-crossover.webp", "/stock-noah-pearl.webp", "/cat-mpv.webp", "/cat-wagon.webp"],
  },
];

const suggested = [
  { name: "Toyota Alphard", image: "/stock-noah-2023.webp", slug: "toyota-alphard" },
  { name: "Land Cruiser LC300 ZX", image: "/cat-suv.webp", slug: "land-cruiser-lc300" },
  { name: "BMW X7 Xdrive40i M-Sport", image: "/cat-crossover.webp", slug: "bmw-x7-black" },
  { name: "Range Rover Vogue Autobiography", image: "/cat-wagon.webp", slug: "range-rover-2020" },
  { name: "Mercedes-Benz S 560e", image: "/stock-noah-black.webp", slug: "mercedes-s560e" },
  { name: "Lexus RX 500h Turbo", image: "/stock-axio.webp", slug: "lexus-rx500h" },
];

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const specs = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["Reg. Year", product.regYear],
    ["Mileage", product.mileage],
    ["Engine (CC)", product.engine],
    ["Transmission", product.transmission],
    ["Fuel Type", product.fuel],
    ["Drive Type", product.drive],
    ["Wheel", product.wheel],
    ["Exterior", product.exterior],
    ["Body Style", product.body],
  ];
  const suggestedItems = suggested.filter((item) => item.slug !== product.slug);

  return (
    <main className="product-page">
      <header className="cars-header product-header">
        <a className="cars-logo" href="/">
          <img src="/recon-logo.webp" alt="Recon Imports" />
        </a>
        <nav aria-label="Product page navigation">
          <a href="/">Home</a>
          <a className="active" href="/car-stocks">
            Car Stocks
          </a>
          <a href="/pre-owned">Pre-Owned</a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/verify-auction-sheet">Verify Auction Sheet</a>
        </nav>
        <a className="download-button cars-download" href="/car-stocks">
          <Download size={17} />
          Download Stock List
        </a>
      </header>

      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/car-stocks">Car Stocks</a>
        <span>/</span>
        <strong>{product.name}</strong>
      </nav>

      <section className="product-gallery" aria-label={`${product.name} gallery`}>
        <img className="product-gallery-main" src={product.hero} alt={product.name} />
        <div className="product-gallery-grid">
          {product.gallery.slice(1).map((image, index) => (
            <img src={image} alt={`${product.name} view ${index + 2}`} key={`${image}-${index}`} />
          ))}
        </div>
      </section>

      <section className="product-heading-row">
        <h1>{product.name}</h1>
        <ShareButton />
      </section>

      <section className="product-detail-layout">
        <div className="product-main-column">
          <div className="product-spec-card">
            {specs.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <article className="product-description">
            <h2>Description</h2>
            <p>
              Indulge in refined comfort with this {product.model} {product.name}, available for purchase from Recon
              Imports. The vehicle is prepared for buyers who want strong road presence, comfort, and dependable daily
              usability.
            </p>
            <h3>Features & Options:</h3>
            <ul>
              <li>Premium cabin with comfortable multi-zone seating</li>
              <li>Automatic transmission with smooth city and highway response</li>
              <li>Modern infotainment display with smartphone compatibility</li>
              <li>LED lighting package with clean exterior finish</li>
              <li>Power assisted doors, mirrors, and convenience controls</li>
              <li>Alloy wheels with excellent exterior stance</li>
            </ul>
            <h3>Safety Features:</h3>
            <ul>
              <li>Pre-collision assistance and stability control systems</li>
              <li>Multiple airbags and advanced braking support</li>
              <li>Parking camera support for easier maneuvering</li>
              <li>Lane support and driver assistance features where equipped</li>
            </ul>
          </article>

          <div className="product-video">
            <img src="/hero-slide-2.webp" alt={`${product.name} video preview`} />
            <span>Play</span>
          </div>
        </div>

        <aside className="product-contact-card">
          <div className="product-price">
            <strong>{product.price}</strong>
            <span>*Price may be slightly negotiable</span>
          </div>
          <div className="product-help">
            <h2>Need help making a choice?</h2>
            <p>
              Our expert sales team is here to assist you to choose your vehicle according to your necessity, choice and
              preference.
            </p>
          </div>
          <a className="product-action light" href="tel:+8801886589009">
            <Phone size={16} />
            Call Us
          </a>
          <a className="product-action pale" href="https://wa.me/8801886589009" target="_blank" rel="noreferrer">
            <MessageCircle size={16} />
            Text Us on WhatsApp
          </a>
          <a className="product-action light" href="/verify-auction-sheet">
            Get a Quote
          </a>
          <button className="product-appointment" type="button">
            Book an Appointment
          </button>
        </aside>
      </section>

      <section className="product-suggested">
        <h2>Suggested for you</h2>
        <SuggestedCarousel items={suggestedItems} />
      </section>

      <footer className="footer product-footer">
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
            <h3>Recon Imports</h3>
            <button type="button">About us</button>
            <a href="/car-stocks">Car Stocks</a>
            <a href="/verify-auction-sheet">Verify Auction Sheet</a>
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
