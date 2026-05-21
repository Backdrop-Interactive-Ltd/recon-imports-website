const siteUrl = "https://reconimports.com";

const stockTypeBasePaths: Record<string, string> = {
  BRAND_NEW: "/brand-new",
  "Brand New": "/brand-new",
  PRE_ORDER: "/pre-order",
  "Pre Order": "/pre-order",
  PRE_OWNED: "/pre-owned",
  "Pre Owned": "/pre-owned",
  RECONDITIONED: "/reconditioned",
  Reconditioned: "/reconditioned",
};

type PublicCarRouteInput = {
  id?: string | null;
  slug?: string | null;
  stockType?: string | null;
  type?: string | null;
};

export function getCarPublicBasePath(stockTypeOrType?: string | null) {
  return stockTypeBasePaths[stockTypeOrType ?? ""] ?? "/brand-new";
}

export function getCarPublicPath(car: PublicCarRouteInput) {
  const slug = (car.slug ?? car.id ?? "").trim();
  const basePath = getCarPublicBasePath(car.stockType ?? car.type);

  return slug ? `${basePath}/${slug}` : basePath;
}

export function getCarPublicUrl(car: PublicCarRouteInput, origin = siteUrl) {
  return `${origin}${getCarPublicPath(car)}`;
}
