const cloudinaryUploadMarker = "/image/upload/";
const optimizedTransform = "f_auto,q_auto";

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

  if (hasAutoOptimization(uploadPath)) {
    return imageUrl;
  }

  const pathParts = uploadPath.split("/");
  const versionIndex = pathParts.findIndex((part) => /^v\d+$/.test(part));
  const existingTransforms = versionIndex > 0 ? pathParts.slice(0, versionIndex).join("/") : "";

  if (existingTransforms && hasAutoOptimization(existingTransforms)) {
    return imageUrl;
  }

  return `${prefix}${cloudinaryUploadMarker}${optimizedTransform}/${uploadPath}`;
}

export function getOptimizedCloudinaryImageUrls(values: string[]) {
  return values.map((value) => getOptimizedCloudinaryImageUrl(value)).filter(Boolean);
}
