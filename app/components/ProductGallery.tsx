import Image from "next/image";
import { getProductGalleryMainImageUrl, getProductGalleryThumbnailImageUrl } from "../../lib/cloudinaryImages";

type ProductGalleryProps = {
  gallery: string[];
  hero: string;
  productName: string;
};

export default function ProductGallery({ gallery, hero, productName }: ProductGalleryProps) {
  const visibleGalleryImages = Array.from(new Set([hero, ...gallery.filter((image) => image && image !== hero)])).slice(0, 5);
  const mainGalleryImage = visibleGalleryImages[0] ?? hero;
  const thumbnailGalleryImages = visibleGalleryImages.slice(1);

  return (
    <section
      className={thumbnailGalleryImages.length > 0 ? "product-gallery" : "product-gallery product-gallery-single"}
      aria-label={`${productName} gallery`}
    >
      <Image
        className="product-gallery-main"
        src={getProductGalleryMainImageUrl(mainGalleryImage)}
        alt={`${productName} main exterior view`}
        width={1200}
        height={900}
        priority
        sizes="(max-width: 900px) 100vw, 50vw"
        suppressHydrationWarning
      />
      {thumbnailGalleryImages.length > 0 ? (
        <div className="product-gallery-grid">
          {thumbnailGalleryImages.map((image, index) => (
            <Image
              src={getProductGalleryThumbnailImageUrl(image)}
              alt={`${productName} gallery view ${index + 2}`}
              width={500}
              height={375}
              key={`${image}-${index}`}
              loading="lazy"
              sizes="(max-width: 900px) 50vw, 25vw"
              suppressHydrationWarning
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
