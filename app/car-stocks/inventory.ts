import { getCarPublicPath } from "../../lib/carPublicRoutes";

type BaseCar = {
  id: string;
  name: string;
  year: string;
  fuel: string;
  type: "Brand New" | "Pre Owned" | "Pre Order" | "Reconditioned";
  mileage: string;
  price: number;
  publicPath?: string;
  saleStatus?: "Available" | "Reserved" | "Sold";
  brand: string;
  brandSlug?: string;
  chassisNumber?: string | null;
  body: string;
  availability: string;
  image: string;
  isEv?: boolean;
  model: string;
  regYear: string;
  detailMileage: string;
  engine: string;
  transmission: string;
  detailFuel: string;
  drive: string;
  wheel: string;
  exterior: string;
  detailBody: string;
  hero: string;
  gallery: string[];
  suggestedImage?: string;
};

export type CarInventoryItem = BaseCar & {
  description: string;
  features: string[];
  safetyFeatures: string[];
  videoImage: string;
  youtubeVideoUrl?: string | null;
};

const defaultFeatures = [
  "Premium cabin with comfortable multi-zone seating",
  "Automatic transmission with smooth city and highway response",
  "Modern infotainment display with smartphone compatibility",
  "LED lighting package with clean exterior finish",
  "Power assisted doors, mirrors, and convenience controls",
  "Alloy wheels with excellent exterior stance",
];

const defaultSafetyFeatures = [
  "Pre-collision assistance and stability control systems",
  "Multiple airbags and advanced braking support",
  "Parking camera support for easier maneuvering",
  "Lane support and driver assistance features where equipped",
];

function createDescription(car: Pick<BaseCar, "model" | "name">) {
  return `Indulge in refined comfort with this ${car.model} ${car.name}, available for purchase from Recon Imports. The vehicle is prepared for buyers who want strong road presence, comfort, and dependable daily usability.`;
}

// Single source of truth for stock cards, detail pages, galleries, specs, and suggested cars.
const baseInventory: BaseCar[] = [
  {
    id: "byd-atto-3",
    name: "BYD Atto 3",
    year: "2024",
    fuel: "Electric",
    type: "Brand New",
    mileage: "0 km",
    price: 6800000,
    brand: "BYD",
    body: "Crossover",
    availability: "Available",
    image: "/cat-crossover.webp",
    isEv: true,
    model: "2024",
    regYear: "2024",
    detailMileage: "0 KM",
    engine: "Electric Motor",
    transmission: "AUTOMATIC",
    detailFuel: "ELECTRIC",
    drive: "FWD",
    wheel: "18 inch",
    exterior: "White",
    detailBody: "Crossover",
    hero: "/cat-crossover.webp",
    gallery: ["/cat-crossover.webp", "/hero-slide-3.webp", "/cat-suv.webp", "/stock-noah-2023.webp", "/cat-mpv.webp"],
    suggestedImage: "/cat-crossover.webp",
  },
  {
    id: "toyota-prado-pre-order",
    name: "Toyota Land Cruiser Prado",
    year: "2025",
    fuel: "Octane",
    type: "Pre Order",
    mileage: "Factory Order",
    price: 14500000,
    brand: "Toyota",
    body: "SUV",
    availability: "Pre Order",
    image: "/cat-suv.webp",
    model: "2025",
    regYear: "Pre Order",
    detailMileage: "Factory Order",
    engine: "2700",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "4WD",
    wheel: "18 inch",
    exterior: "Pearl White",
    detailBody: "SUV",
    hero: "/cat-suv.webp",
    gallery: ["/cat-suv.webp", "/hero-slide-1.webp", "/stock-noah-2023.webp", "/cat-crossover.webp", "/cat-wagon.webp"],
    suggestedImage: "/cat-suv.webp",
  },
  {
    id: "land-cruiser-lc300",
    name: "Land Cruiser LC300 ZX",
    year: "2022",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "23K km",
    price: 37900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/stock-noah-2023.webp",
    model: "2022",
    regYear: "2022",
    detailMileage: "23k KM",
    engine: "3500",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "Pearl White",
    detailBody: "SUV",
    hero: "/stock-noah-2023.webp",
    gallery: ["/stock-noah-2023.webp", "/cat-suv.webp", "/stock-noah-white.webp", "/stock-noah-pearl.webp", "/cat-crossover.webp"],
    suggestedImage: "/cat-suv.webp",
  },
  {
    id: "bmw-x7-blue",
    name: "BMW X7",
    year: "2021",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "15K km",
    price: 27900000,
    brand: "BMW",
    body: "SUV",
    availability: "Available",
    image: "/cat-mpv.webp",
    model: "2021",
    regYear: "2021",
    detailMileage: "15k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "Blue",
    detailBody: "SUV",
    hero: "/cat-mpv.webp",
    gallery: ["/cat-mpv.webp", "/cat-crossover.webp", "/stock-noah-black.webp", "/stock-noah-pearl.webp", "/cat-wagon.webp"],
  },
  {
    id: "bmw-x7-black",
    name: "BMW X7 Xdrive40i M-Sport",
    year: "2022",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "15K km",
    price: 26900000,
    brand: "BMW",
    body: "SUV",
    availability: "Available",
    image: "/cat-crossover.webp",
    model: "2022",
    regYear: "2022",
    detailMileage: "15k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "Black",
    detailBody: "SUV",
    hero: "/cat-crossover.webp",
    gallery: ["/cat-crossover.webp", "/cat-mpv.webp", "/stock-noah-black.webp", "/stock-noah-white.webp", "/cat-suv.webp"],
    suggestedImage: "/cat-crossover.webp",
  },
  {
    id: "range-rover-2020",
    name: "Range Rover Vogue Autobiography",
    year: "2020",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "5K Miles",
    price: 24900000,
    brand: "Land Rover",
    body: "SUV",
    availability: "Available",
    image: "/cat-wagon.webp",
    model: "2020",
    regYear: "2020",
    detailMileage: "5k Miles",
    engine: "3000",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "AWD",
    wheel: "22 inch",
    exterior: "White",
    detailBody: "SUV",
    hero: "/cat-wagon.webp",
    gallery: ["/cat-wagon.webp", "/cat-suv.webp", "/stock-axio.webp", "/cat-crossover.webp", "/stock-noah-white.webp"],
    suggestedImage: "/cat-wagon.webp",
  },
  {
    id: "range-rover-2019",
    name: "Range Rover Vogue Autobiography",
    year: "2019",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "14K km",
    price: 21900000,
    brand: "Land Rover",
    body: "SUV",
    availability: "Available",
    image: "/stock-axio.webp",
    model: "2019",
    regYear: "2019",
    detailMileage: "14k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "White",
    detailBody: "SUV",
    hero: "/stock-axio.webp",
    gallery: ["/stock-axio.webp", "/cat-wagon.webp", "/stock-noah-white.webp", "/cat-suv.webp", "/cat-crossover.webp"],
  },
  {
    id: "mercedes-s560e",
    name: "Mercedes-Benz S 560e",
    year: "2019",
    fuel: "Octane (H)",
    type: "Pre Owned",
    mileage: "11K m",
    price: 18900000,
    brand: "Mercedes-Benz",
    body: "Sedan",
    availability: "Available",
    image: "/stock-noah-black.webp",
    model: "2019",
    regYear: "2019",
    detailMileage: "11k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE HYBRID",
    drive: "RWD",
    wheel: "20 inch",
    exterior: "Black",
    detailBody: "Sedan",
    hero: "/stock-noah-black.webp",
    gallery: ["/stock-noah-black.webp", "/stock-noah-pearl.webp", "/stock-axio.webp", "/cat-crossover.webp", "/cat-mpv.webp"],
    suggestedImage: "/stock-noah-black.webp",
  },
  {
    id: "land-cruiser-zx-v8",
    name: "Land Cruiser Zx-V8",
    year: "2015",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "71K km",
    price: 18900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/stock-noah-white.webp",
    model: "2015",
    regYear: "2015",
    detailMileage: "71k KM",
    engine: "4600",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "White",
    detailBody: "SUV",
    hero: "/stock-noah-white.webp",
    gallery: ["/stock-noah-white.webp", "/cat-suv.webp", "/cat-crossover.webp", "/stock-noah-2023.webp", "/cat-wagon.webp"],
  },
  {
    id: "bmw-745le",
    name: "BMW 745Le",
    year: "2019",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "15K km",
    price: 18900000,
    brand: "BMW",
    body: "Sedan",
    availability: "Available",
    image: "/stock-noah-pearl.webp",
    model: "2019",
    regYear: "2019",
    detailMileage: "15k KM",
    engine: "3000",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE HYBRID",
    drive: "RWD",
    wheel: "20 inch",
    exterior: "Pearl",
    detailBody: "Sedan",
    hero: "/stock-noah-pearl.webp",
    gallery: ["/stock-noah-pearl.webp", "/stock-noah-black.webp", "/cat-crossover.webp", "/stock-axio.webp", "/cat-mpv.webp"],
  },
  {
    id: "toyota-alphard",
    name: "Toyota Alphard",
    year: "2024",
    fuel: "Octane (H)",
    type: "Reconditioned",
    mileage: "8K km",
    price: 16900000,
    brand: "Toyota",
    body: "MPV",
    availability: "Available",
    image: "/stock-noah-2023.webp",
    model: "2024",
    regYear: "2024",
    detailMileage: "8k KM",
    engine: "2500",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE+HYBRID",
    drive: "AWD",
    wheel: "19 inch",
    exterior: "Bronze",
    detailBody: "Minivan / MPV",
    hero: "/stock-noah-2023.webp",
    gallery: ["/stock-noah-2023.webp", "/cat-mpv.webp", "/stock-noah-pearl.webp", "/stock-noah-black.webp", "/cat-crossover.webp"],
    suggestedImage: "/stock-noah-2023.webp",
  },
  {
    id: "land-cruiser-vx-2016",
    name: "Land Cruiser Vx-V8",
    year: "2016",
    fuel: "Diesel",
    type: "Pre Owned",
    mileage: "41K km",
    price: 16900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/cat-suv.webp",
    model: "2016",
    regYear: "2016",
    detailMileage: "41k KM",
    engine: "4600",
    transmission: "AUTOMATIC",
    detailFuel: "DIESEL",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "White",
    detailBody: "SUV",
    hero: "/cat-suv.webp",
    gallery: ["/cat-suv.webp", "/stock-noah-white.webp", "/cat-crossover.webp", "/cat-wagon.webp", "/stock-noah-2023.webp"],
  },
  {
    id: "land-cruiser-vx-2015",
    name: "Land Cruiser Vx-V8",
    year: "2015",
    fuel: "Diesel",
    type: "Pre Owned",
    mileage: "74K km",
    price: 15900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/cat-crossover.webp",
    model: "2015",
    regYear: "2015",
    detailMileage: "74k KM",
    engine: "4600",
    transmission: "AUTOMATIC",
    detailFuel: "DIESEL",
    drive: "4WD",
    wheel: "20 inch",
    exterior: "Black",
    detailBody: "SUV",
    hero: "/cat-crossover.webp",
    gallery: ["/cat-crossover.webp", "/cat-suv.webp", "/stock-noah-black.webp", "/stock-noah-white.webp", "/cat-wagon.webp"],
  },
  {
    id: "lexus-rx500h",
    name: "Lexus RX 500h Turbo",
    year: "2023",
    fuel: "Octane (H)",
    type: "Pre Owned",
    mileage: "22K km",
    price: 14900000,
    brand: "Lexus",
    body: "Crossover",
    availability: "Available",
    image: "/stock-axio.webp",
    model: "2023",
    regYear: "2023",
    detailMileage: "22k KM",
    engine: "2400",
    transmission: "AUTOMATIC",
    detailFuel: "OCTANE HYBRID",
    drive: "AWD",
    wheel: "21 inch",
    exterior: "Red",
    detailBody: "Crossover",
    hero: "/stock-axio.webp",
    gallery: ["/stock-axio.webp", "/cat-crossover.webp", "/stock-noah-pearl.webp", "/cat-mpv.webp", "/cat-wagon.webp"],
    suggestedImage: "/stock-axio.webp",
  },
];

export const inventory: CarInventoryItem[] = baseInventory.map((car) => ({
  ...car,
  description: createDescription(car),
  features: defaultFeatures,
  safetyFeatures: defaultSafetyFeatures,
  videoImage: "/hero-slide-2.webp",
}));

export const suggestedCarIds = [
  "byd-atto-3",
  "toyota-prado-pre-order",
  "toyota-alphard",
  "land-cruiser-lc300",
  "bmw-x7-black",
  "range-rover-2020",
  "mercedes-s560e",
  "lexus-rx500h",
];

export function formatPrice(price: number) {
  return `BDT ${new Intl.NumberFormat("en-IN").format(price)}`;
}

export function getCarBySlug(slug: string) {
  return inventory.find((car) => car.id === slug);
}

export function getSuggestedCars(currentSlug: string) {
  return suggestedCarIds
    .filter((id) => id !== currentSlug)
    .map((id) => inventory.find((car) => car.id === id))
    .filter((car): car is CarInventoryItem => Boolean(car))
    .map((car) => ({
      image: car.suggestedImage ?? car.image,
      name: car.name,
      publicPath: car.publicPath ?? getCarPublicPath({ id: car.id, type: car.type }),
      slug: car.id,
    }));
}
