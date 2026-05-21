import Link from "next/link";
import CarsSubnav from "../CarsSubnav";
import CarRowActions from "../CarRowActions";
import { formatCarPrice, getAdminCars } from "../queries";
import styles from "../../brands/page.module.css";

export const metadata = {
  title: "Manage Cars | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

export default async function ManageCarsPage() {
  const cars = await getAdminCars();

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Inventory</p>
          <h1>Manage Cars</h1>
          <span>Edit, publish, feature, update sale status, or delete existing inventory.</span>
        </div>
      </div>

      <CarsSubnav />

      <section className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div>
            <p>Manage</p>
            <h2>Inventory controls</h2>
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
                      {car.primaryImage ? (
                        <img alt={`${car.title} primary`} src={car.primaryImage} suppressHydrationWarning />
                      ) : (
                        car.title.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <div>
                      <h3>{car.title}</h3>
                      <p>
                        /{car.slug} - {car.brand.name}
                      </p>
                    </div>
                  </div>
                  <div className={styles.badgeGroup}>
                    <span className={car.isPublished ? styles.activeBadge : styles.inactiveBadge}>
                      {car.isPublished ? "Published" : "Draft"}
                    </span>
                    <span className={car.saleStatus === "SOLD" ? styles.soldBadge : styles.inactiveBadge}>{car.saleStatusLabel}</span>
                  </div>
                </div>

                <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                  <div>
                    <dt>Price</dt>
                    <dd>{formatCarPrice(car.price)}</dd>
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
                    <dt>Featured</dt>
                    <dd>{car.isFeatured ? "Yes" : "No"}</dd>
                  </div>
                </dl>

                <div className={styles.rowButtons}>
                  <Link className={styles.secondaryLinkButton} href={`/admin/cars/manage/${car.id}`}>
                    Edit
                  </Link>
                </div>
                <CarRowActions
                  carId={car.id}
                  carTitle={car.title}
                  isFeatured={car.isFeatured}
                  isPublished={car.isPublished}
                  saleStatus={car.saleStatus}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No cars yet</strong>
            <p>Create the first inventory item from the Add Cars page.</p>
          </div>
        )}
      </section>
    </section>
  );
}
