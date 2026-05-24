import type { CarInventoryItem } from "./car-stocks/inventory";
import type { PublicSiteSettings } from "../lib/siteSettingsConfig";

export type HomepageBrand = {
  logoUrl?: string | null;
  name: string;
  slug: string;
};

export type HomepageCategory = {
  copy: string;
  href: string;
  iconKey?: string | null;
  id: string;
  image: string;
  imageAlt?: string | null;
  title: string;
};

export type HomepageHeroSlide = {
  ctaLink?: string | null;
  ctaText?: string | null;
  image: string;
  imageClass: string;
  subtitle?: string | null;
  textAnimation: string;
  title: string;
};

export type HomepageSearchItem = {
  brand: string;
  condition: string;
  href: string;
  image: string;
  name: string;
  price: number;
  searchText: string;
  slug: string;
  stockType: string;
  year: string;
};

export type HomepageProps = {
  brands?: HomepageBrand[];
  categories?: HomepageCategory[];
  deals?: CarInventoryItem[];
  heroSlides?: HomepageHeroSlide[];
  searchItems?: HomepageSearchItem[];
  siteSettings?: PublicSiteSettings;
};
