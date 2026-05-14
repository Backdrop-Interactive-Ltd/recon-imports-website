import { prisma } from "../../../../lib/prisma";
import CarForm from "./CarForm";
import CarRowActions from "./CarRowActions";
import { formatEnumLabel } from "./validation";
import styles from "../brands/page.module.css";

export const metadata = {
  title: "Cars | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatPrice(price: number) {
  return `BDT ${new Intl.NumberFormat("en-IN").format(price)}`;
}

async function getBrands() {
  return prisma.brand.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });
}

async function getCars() {
  const cars = await prisma.car.findMany({
    include: {
      brand: {
        select: {
          name: true,
        },
      },
      features: {
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
        select: {
          sortOrder: true,
          title: true,
          type: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          altText: true,
          imageUrl: true,
          isPrimary: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ isPublished: "desc" }, { isFeatured: "desc" }, { updatedAt: "desc" }],
  });

  return cars.map((car) => ({
    ...car,
    bodyTypeLabel: formatEnumLabel(car.bodyType),
    conditionLabel: formatEnumLabel(car.condition),
    fuelTypeLabel: formatEnumLabel(car.fuelType),
    primaryImage: car.images.find((image) => image.isPrimary)?.imageUrl ?? car.images[0]?.imageUrl ?? "",
    stockTypeLabel: formatEnumLabel(car.stockType),
    transmissionLabel: formatEnumLabel(car.transmission),
    updatedAtLabel: dateFormatter.format(car.updatedAt),
  }));
}

export default async function AdminCarsPage() {
  const [brands, cars] = await Promise.all([getBrands(), getCars()]);
  const publishedCars = cars.filter((car) => car.isPublished).length;
  const featuredCars = cars.filter((car) => car.isFeatured).length;

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Inventory</p>
          <h1>Cars</h1>
          <span>Manage car inventory, pricing, images, specifications, features, safety details, and publish status.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Cars</span>
          <strong>{cars.length}</strong>
        </div>
        <div>
          <span>Published</span>
          <strong>{publishedCars}</strong>
        </div>
        <div>
          <span>Featured</span>
          <strong>{featuredCars}</strong>
        </div>
      </div>

      <div className={styles.managementGrid}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <p>Add Car</p>
            <h2>Create inventory item</h2>
          </div>
          {brands.length > 0 ? (
            <CarForm brands={brands} mode="create" />
          ) : (
            <div className={styles.emptyState}>
              <strong>No brands yet</strong>
              <p>Create a brand before adding cars.</p>
            </div>
          )}
        </section>

        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div>
              <p>Car List</p>
              <h2>Database inventory</h2>
            </div>
            <span>{cars.length} total</span>
          </div>

          {cars.length > 0 ? (
            <div className={styles.brandList}>
              {cars.map((car) => (
                <article className={styles.brandCard} key={car.id}>
                  <div className={styles.brandTopline}>
                    <div className={styles.brandIdentity}>
                      <span className={styles.logoBox}>
                        {car.primaryImage ? <img alt={`${car.title} primary`} src={car.primaryImage} /> : car.title.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3>{car.title}</h3>
                        <p>
                          /{car.slug} - {car.brand.name}
                        </p>
                      </div>
                    </div>
                    <span className={car.isPublished ? styles.activeBadge : styles.inactiveBadge}>
                      {car.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                    <div>
                      <dt>Price</dt>
                      <dd>{formatPrice(car.price)}</dd>
                    </div>
                    <div>
                      <dt>Year</dt>
                      <dd>{car.year}</dd>
                    </div>
                    <div>
                      <dt>Stock</dt>
                      <dd>{car.stockTypeLabel}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{car.updatedAtLabel}</dd>
                    </div>
                  </dl>

                  <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                    <div>
                      <dt>Body</dt>
                      <dd>{car.bodyTypeLabel}</dd>
                    </div>
                    <div>
                      <dt>Fuel</dt>
                      <dd>{car.fuelTypeLabel}</dd>
                    </div>
                    <div>
                      <dt>Transmission</dt>
                      <dd>{car.transmissionLabel}</dd>
                    </div>
                    <div>
                      <dt>Featured</dt>
                      <dd>{car.isFeatured ? "Yes" : "No"}</dd>
                    </div>
                  </dl>

                  <details className={styles.editDetails}>
                    <summary>Edit car</summary>
                    <CarForm
                      brands={brands}
                      car={{
                        bodyType: car.bodyType,
                        brandId: car.brandId,
                        condition: car.condition,
                        description: car.description,
                        driveTrain: car.driveTrain,
                        engine: car.engine,
                        exteriorColor: car.exteriorColor,
                        features: car.features,
                        fuelType: car.fuelType,
                        grade: car.grade,
                        id: car.id,
                        images: car.images,
                        interiorColor: car.interiorColor,
                        isFeatured: car.isFeatured,
                        isPublished: car.isPublished,
                        location: car.location,
                        mileage: car.mileage,
                        model: car.model,
                        origin: car.origin,
                        packageName: car.packageName,
                        price: car.price,
                        slug: car.slug,
                        stockType: car.stockType,
                        title: car.title,
                        transmission: car.transmission,
                        videoImageUrl: car.videoImageUrl,
                        year: car.year,
                      }}
                      mode="edit"
                    />
                  </details>

                  <CarRowActions carId={car.id} carTitle={car.title} isFeatured={car.isFeatured} isPublished={car.isPublished} />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No cars yet</strong>
              <p>Create the first inventory item from the form on this page.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
