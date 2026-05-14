import { prisma } from "../../../../lib/prisma";
import styles from "../brands/page.module.css";
import HeroSlideForm from "./HeroSlideForm";
import HeroSlideRowActions from "./HeroSlideRowActions";

export const metadata = {
  title: "Homepage | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

async function getHeroSlides() {
  const slides = await prisma.heroSlide.findMany({
    orderBy: [
      { isActive: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      ctaLink: true,
      ctaText: true,
      id: true,
      imageUrl: true,
      isActive: true,
      sortOrder: true,
      subtitle: true,
      title: true,
      updatedAt: true,
    },
  });

  return slides.map((slide) => ({
    ...slide,
    updatedAtLabel: dateFormatter.format(slide.updatedAt),
  }));
}

export default async function AdminHomepagePage() {
  const slides = await getHeroSlides();
  const activeSlides = slides.filter((slide) => slide.isActive).length;
  const inactiveSlides = slides.length - activeSlides;

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Content</p>
          <h1>Homepage</h1>
          <span>Manage homepage hero slider images, titles, links, ordering, and active status.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Slides</span>
          <strong>{slides.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeSlides}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveSlides}</strong>
        </div>
      </div>

      <div className={styles.managementGrid}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <p>Add Hero Slide</p>
            <h2>Create a new hero slide</h2>
          </div>
          <HeroSlideForm mode="create" />
        </section>

        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div>
              <p>Hero Slider</p>
              <h2>Database slides</h2>
            </div>
            <span>{slides.length} total</span>
          </div>

          {slides.length > 0 ? (
            <div className={styles.brandList}>
              {slides.map((slide) => (
                <article className={styles.brandCard} key={slide.id}>
                  <div className={styles.brandTopline}>
                    <div className={styles.brandIdentity}>
                      <span className={styles.logoBox}>
                        <img alt={`${slide.title} hero`} src={slide.imageUrl} />
                      </span>
                      <div>
                        <h3>{slide.title}</h3>
                        <p>{slide.subtitle || "No subtitle"}</p>
                      </div>
                    </div>
                    <span className={slide.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {slide.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                    <div>
                      <dt>Sort Order</dt>
                      <dd>{slide.sortOrder}</dd>
                    </div>
                    <div>
                      <dt>CTA</dt>
                      <dd>{slide.ctaText || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>CTA Link</dt>
                      <dd>{slide.ctaLink || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{slide.updatedAtLabel}</dd>
                    </div>
                  </dl>

                  <details className={styles.editDetails}>
                    <summary>Edit hero slide</summary>
                    <HeroSlideForm
                      mode="edit"
                      slide={{
                        ctaLink: slide.ctaLink,
                        ctaText: slide.ctaText,
                        id: slide.id,
                        imageUrl: slide.imageUrl,
                        isActive: slide.isActive,
                        sortOrder: slide.sortOrder,
                        subtitle: slide.subtitle,
                        title: slide.title,
                      }}
                    />
                  </details>

                  <HeroSlideRowActions isActive={slide.isActive} slideId={slide.id} slideTitle={slide.title} />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No hero slides yet</strong>
              <p>Create the first hero slide from the form on this page.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
