import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";
import { brandOptions } from "./car-stocks/brands";
import { inventory } from "./car-stocks/inventory";
import Footer from "./components/Footer";
import HeroSlider from "./components/home/HeroSlider";
import HomeHeader from "./components/home/HomeHeader";
import VerifySection from "./components/home/VerifySection";
import { getCarPublicPath } from "../lib/carPublicRoutes";
import { fallbackSiteSettings } from "../lib/siteSettingsConfig";
import type { HomepageBrand, HomepageCategory, HomepageHeroSlide, HomepageSearchItem, HomepageProps } from "./homeTypes";

const PurposeCategoryCarousel = dynamic(() => import("./components/home/PurposeCategoryCarousel"));
const UnbeatableDealsCarousel = dynamic(() => import("./components/home/UnbeatableDealsCarousel"));
const BrandShowcase = dynamic(() => import("./components/home/BrandShowcase"));

const fallbackHeroSlides: HomepageHeroSlide[] = [
  {
    title: "Explore a world of affordable options",
    image: "/hero-slide-1.webp",
    imageClass: "hero-image-default",
    textAnimation: "hero-text-rise",
  },
  {
    title: "Discover spacious comfort and reliability",
    image: "/hero-slide-2.webp",
    imageClass: "hero-image-focus-left",
    textAnimation: "hero-text-track",
  },
  {
    title: "Drive away with unbeatable deals",
    image: "/hero-slide-3.webp",
    imageClass: "hero-image-focus-right",
    textAnimation: "hero-text-scale",
  },
];

const fallbackCategories: HomepageCategory[] = [
  {
    id: "sedan",
    title: "Sedan",
    href: "/sedan",
    copy: "Comfortable city driving with a refined passenger-first profile.",
    iconKey: "car",
    image: "/stock-axio.webp",
    imageAlt: "Sedan vehicle detail",
  },
  {
    id: "hatchback",
    title: "Hatchback",
    href: "/hatchback",
    copy: "Compact, practical, and easy to handle for daily movement.",
    iconKey: "car",
    image: "/stock-noah-white.webp",
    imageAlt: "Hatchback vehicle detail",
  },
  {
    id: "suv",
    title: "SUV",
    href: "/suv",
    copy: "Spacious and versatile for power and adventure.",
    iconKey: "car",
    image: "/cat-suv.webp",
    imageAlt: "SUV vehicle detail",
  },
  {
    id: "crossover",
    title: "Crossover",
    href: "/crossover",
    copy: "Blending sedan agility with the versatile, elevated stance of an SUV.",
    iconKey: "car",
    image: "/cat-crossover.webp",
    imageAlt: "Crossover vehicle detail",
  },
  {
    id: "mpv",
    title: "MPV",
    href: "/mpv",
    copy: "Multi-purpose vehicles designed for maximum seating and flexibility.",
    iconKey: "car",
    image: "/cat-mpv.webp",
    imageAlt: "MPV vehicle detail",
  },
  {
    id: "passenger-van",
    title: "Passenger Van",
    href: "/passenger-van",
    copy: "Roomy passenger transport for groups, families, and business needs.",
    iconKey: "car",
    image: "/cat-wagon.webp",
    imageAlt: "Passenger Van vehicle detail",
  },
];

const fallbackBrands: HomepageBrand[] = brandOptions.map((brand) => ({
  logoUrl: null,
  name: brand.name,
  slug: brand.slug,
}));

const fallbackSearchItems: HomepageSearchItem[] = inventory.slice(0, 100).map((car) => ({
  brand: car.brand,
  condition: car.type,
  href: car.publicPath || getCarPublicPath({ id: car.id, type: car.type }),
  image: car.image,
  name: car.name,
  price: car.price,
  searchText: `${car.brand} ${car.name} ${car.year} ${car.body} ${car.type}`.toLowerCase(),
  slug: car.id,
  stockType: car.type,
  year: car.year,
}));

function getPhoneHref(phoneNumber?: string) {
  const compactPhone = phoneNumber?.replace(/[^\d+]/g, "") ?? "";
  return compactPhone ? `tel:${compactPhone}` : "";
}

function getWhatsAppHref(whatsAppNumber?: string) {
  const compactPhone = whatsAppNumber?.replace(/[^\d]/g, "") ?? "";
  return compactPhone ? `https://wa.me/${compactPhone}` : "";
}

export default function HomeClient({
  brands = fallbackBrands,
  categories = fallbackCategories,
  deals,
  heroSlides = fallbackHeroSlides,
  searchItems = fallbackSearchItems,
  siteSettings = fallbackSiteSettings,
}: HomepageProps) {
  const purposeSectionTitle = siteSettings.homepagePurposeSectionTitle || "Explore vehicles that suit your purpose";
  const phoneHref = getPhoneHref(siteSettings.phoneNumber);
  const whatsappHref = getWhatsAppHref(siteSettings.whatsappNumber);
  const dealItems = deals === undefined ? inventory.slice(-10).reverse() : deals;

  return (
    <main>
      <HomeHeader phoneHref={phoneHref} searchItems={searchItems} siteSettings={siteSettings} />
      <HeroSlider heroSlides={heroSlides} />
      <VerifySection />
      <PurposeCategoryCarousel categories={categories} title={purposeSectionTitle} />
      <UnbeatableDealsCarousel deals={dealItems} />
      <BrandShowcase brands={brands} />
      <Footer settings={siteSettings} />

      <a className="whatsapp" href={whatsappHref || "https://wa.me/8801886589009"} aria-label="Chat on WhatsApp">
        <MessageCircle size={28} />
      </a>
    </main>
  );
}

export type { HomepageBrand, HomepageCategory, HomepageHeroSlide, HomepageSearchItem } from "./homeTypes";
