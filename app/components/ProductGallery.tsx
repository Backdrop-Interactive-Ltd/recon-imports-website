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
      <img
        className="product-gallery-main"
        src={mainGalleryImage}
        alt={`${productName} main exterior view`}
        suppressHydrationWarning
      />
      {thumbnailGalleryImages.length > 0 ? (
        <div className="product-gallery-grid">
          {thumbnailGalleryImages.map((image, index) => (
            <img
              src={image}
              alt={`${productName} gallery view ${index + 2}`}
              key={`${image}-${index}`}
              loading="lazy"
              suppressHydrationWarning
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
