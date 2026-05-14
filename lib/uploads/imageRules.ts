export const ADMIN_IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

export const ADMIN_IMAGE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.svg";

export const ADMIN_IMAGE_UPLOAD_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "svg"]);

export type ImageFileMeta = {
  name: string;
  size: number;
  type: string;
};

export function formatUploadSize(bytes: number) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

export function validateAdminImageFile(file: ImageFileMeta) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const hasAllowedType = ADMIN_IMAGE_UPLOAD_ALLOWED_TYPES.includes(
    file.type as (typeof ADMIN_IMAGE_UPLOAD_ALLOWED_TYPES)[number],
  );
  const hasAllowedExtension = allowedExtensions.has(extension);

  if (!hasAllowedType || !hasAllowedExtension) {
    return `Choose a valid image file: ${ADMIN_IMAGE_UPLOAD_ACCEPT}.`;
  }

  if (file.size > ADMIN_IMAGE_UPLOAD_MAX_BYTES) {
    return `Image must be ${formatUploadSize(ADMIN_IMAGE_UPLOAD_MAX_BYTES)} or smaller.`;
  }

  return "";
}
