import Image from "next/image";
import { isSvgImageUrl } from "../../lib/cloudinaryImages";

type PublicLogoImageProps = {
  alt: string;
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
  height: number;
  loading?: "eager" | "lazy";
  priority?: boolean;
  sizes?: string;
  src?: string | null;
  width: number;
};

function canUseNextImage(src: string) {
  return src.startsWith("/") || src.includes("res.cloudinary.com");
}

export default function PublicLogoImage({
  alt,
  className,
  fetchPriority,
  height,
  loading,
  priority,
  sizes,
  src,
  width,
}: PublicLogoImageProps) {
  const imageSrc = src?.trim() ?? "";

  if (!imageSrc) {
    return null;
  }

  if (isSvgImageUrl(imageSrc) || !canUseNextImage(imageSrc)) {
    return (
      <img
        className={className}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        fetchPriority={fetchPriority ?? (priority ? "high" : undefined)}
        loading={loading}
        suppressHydrationWarning
      />
    );
  }

  return (
    <Image
      className={className}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : loading}
      priority={priority}
      fetchPriority={fetchPriority}
      sizes={sizes}
      suppressHydrationWarning
    />
  );
}
