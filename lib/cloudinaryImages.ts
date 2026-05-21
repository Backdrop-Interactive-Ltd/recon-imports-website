const cloudinaryUploadMarker = "/image/upload/";
const optimizedTransform = "f_auto,q_auto";
const cloudinaryTransforms = {
  brandLogo: "f_auto,q_auto,w_240,c_limit",
  carCard: "f_auto,q_auto,w_600,c_fill",
  hero: "f_auto,q_auto,w_1600,c_fill",
  logo: "f_auto,q_auto,w_260,c_limit",
  productGalleryMain: "f_auto,q_auto,w_1200,c_fill",
  productGalleryThumbnail: "f_auto,q_auto,w_500,c_fill",
} as const;

function isSvgUrl(value: string) {
  try {
    const url = new URL(value);
    return url.pathname.toLowerCase().endsWith(".svg");
  } catch {
    return value.split("?")[0]?.toLowerCase().endsWith(".svg") ?? false;
  }
}

function hasAutoOptimization(transformPath: string) {
  const transformParts = transformPath.split(/[/,]/);
  return transformParts.includes("f_auto") && transformParts.includes("q_auto");
}

export function getOptimizedCloudinaryImageUrl(value?: string | null) {
  return getCloudinaryImageUrl(value, optimizedTransform);
}

export function getCloudinaryImageUrl(value?: string | null, transform = optimizedTransform) {
  const imageUrl = value?.trim() ?? "";

  if (!imageUrl || !imageUrl.includes("res.cloudinary.com") || !imageUrl.includes(cloudinaryUploadMarker)) {
    return imageUrl;
  }

  if (isSvgUrl(imageUrl)) {
    return imageUrl;
  }

  const [prefix, uploadPath] = imageUrl.split(cloudinaryUploadMarker);

  if (!prefix || !uploadPath) {
    return imageUrl;
  }

  const pathParts = uploadPath.split("/");
  const versionIndex = pathParts.findIndex((part) => /^v\d+$/.test(part));
  const publicIdParts = versionIndex >= 0 ? pathParts.slice(versionIndex) : pathParts;

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
