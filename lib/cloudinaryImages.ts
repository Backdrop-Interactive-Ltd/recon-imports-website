const cloudinaryUploadMarker = "/image/upload/";
const optimizedTransform = "f_auto,q_auto";
const cloudinaryTransforms = {
  brandLogo: "f_auto,q_auto,w_220,c_limit",
  carCard: "f_auto,q_auto,w_600,c_fill",
  hero: "f_auto,q_auto,w_1600,c_fill",
  logo: "f_auto,q_auto,w_260,c_limit",
  openGraph: "f_auto,q_auto,w_1200,c_fill",
  productGalleryMain: "f_auto,q_auto,w_1200,c_fill",
  productGalleryThumbnail: "f_auto,q_auto,w_500,c_fill",
  suggestedCar: "f_auto,q_auto,w_500,c_fill",
} as const;

export function isSvgImageUrl(value?: string | null) {
  const imageUrl = value?.trim() ?? "";

  if (!imageUrl) {
    return false;
  }

  try {
    const url = new URL(imageUrl);
    return url.pathname.toLowerCase().endsWith(".svg");
  } catch {
    return imageUrl.split("?")[0]?.toLowerCase().endsWith(".svg") ?? false;
  }
}

function hasAutoOptimization(transformPath: string) {
  const transformParts = transformPath.split(/[/,]/);
  return transformParts.includes("f_auto") && transformParts.includes("q_auto");
}

function isTransformationSegment(pathPart: string) {
  const transformParts = pathPart.split(",");

  return transformParts.every((part) => /^[a-z]{1,4}_[^/]+$/.test(part));
}

export function getOptimizedCloudinaryImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, optimizedTransform);
}

export function getCloudinaryImageUrl(value?: string | null, transform = optimizedTransform) {
  const imageUrl = value?.trim() ?? "";

  if (!imageUrl || !imageUrl.includes("res.cloudinary.com") || !imageUrl.includes(cloudinaryUploadMarker)) {
    return imageUrl;
  }

  if (isSvgImageUrl(imageUrl)) {
    return imageUrl;
  }

  const [prefix, uploadPath] = imageUrl.split(cloudinaryUploadMarker);

  if (!prefix || !uploadPath) {
    return imageUrl;
  }

  const pathParts = uploadPath.split("/");
  const versionIndex = pathParts.findIndex((part) => /^v\d+$/.test(part));
  const firstPublicIdIndex =
    versionIndex >= 0 ? versionIndex : pathParts.findIndex((part) => !isTransformationSegment(part));
  const publicIdParts = pathParts.slice(Math.max(firstPublicIdIndex, 0));

  if (transform === optimizedTransform && hasAutoOptimization(uploadPath)) {
    return imageUrl;
  }

  return `${prefix}${cloudinaryUploadMarker}${transform}/${publicIdParts.join("/")}`;
}

export function getOptimizedCloudinaryImageUrls(values: string[]) {
  return values.map((value) => getOptimizedCloudinaryImageUrl(value)).filter(Boolean);
}

export function getHeroImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.hero);
}

export function getCarCardImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.carCard);
}

export function getSuggestedCarImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.suggestedCar);
}

export function getProductGalleryMainImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.productGalleryMain);
}

export function getProductGalleryThumbnailImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.productGalleryThumbnail);
}

export function getBrandLogoImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.brandLogo);
}

export function getLogoImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.logo);
}

export function getOpenGraphImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, cloudinaryTransforms.openGraph);
}
