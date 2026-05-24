import Link from "next/link";
import AdminPagination from "../../_components/AdminPagination";
import { getStringParam } from "../../_components/listParams";
import CarsSubnav from "../CarsSubnav";
import CarRowActions from "../CarRowActions";
import { formatEnumLabel, saleStatusOptions, stockTypeOptions } from "../formOptions";
import { formatCarPrice, getAdminCars, getCarBrands, type AdminCarListFilters } from "../queries";
import styles from "../../brands/page.module.css";

export const metadata = {
  title: "Manage Cars | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

export default async function ManageCarsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: AdminCarListFilters = {
    brandId: getStringParam(params.brandId),
    featured: getStringParam(params.featured),
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
    published: getStringParam(params.published),
    q: getStringParam(params.q),
    saleStatus: getStringParam(params.saleStatus),
    sort: getStringParam(params.sort),
    stockType: getStringParam(params.stockType),
  };
  const [brands, carsPage] = await Promise.all([getCarBrands(), getAdminCars(filters)]);
  const cars = carsPage.items;
  const pageParams = {
    brandId: filters.brandId,
    featured: filters.featured,
    published: filters.published,
    q: filters.q,
    saleStatus: filters.saleStatus,
    sort: filters.sort,
    stockType: filters.stockType,
  };

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
        <form className={styles.filterBar} method="get">
          <label>
            <span>Search</span>
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Title, slug, brand, chassis, model" />
          </label>
          <label>
            <span>Sale</span>
            <select name="saleStatus" defaultValue={filters.saleStatus ?? ""}>
              <option value="">All</option>
              {saleStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Stock</span>
            <select name="stockType" defaultValue={filters.stockType ?? ""}>
              <option value="">All</option>
              {stockTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Publish</span>
            <select name="published" defaultValue={filters.published ?? ""}>
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </select>
          </label>
          <label>
            <span>Featured</span>
            <select name="featured" defaultValue={filters.featured ?? ""}>
              <option value="">All</option>
              <option value="true">Featured</option>
              <option value="false">Not featured</option>
            </select>
          </label>
          <label>
            <span>Brand</span>
            <select name="brandId" defaultValue={filters.brandId ?? ""}>
              <option value="">All</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select name="sort" defaultValue={filters.sort ?? ""}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
              <option value="year-asc">Year low to high</option>
              <option value="year-desc">Year high to low</option>
            </select>
          </label>
          <label>
            <span>Page size</span>
            <select name="pageSize" defaultValue={filters.pageSize || "20"}>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Apply
          </button>
          <Link className={styles.secondaryLinkButton} href="/admin/cars/manage">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Manage</p>
            <h2>Inventory controls</h2>
          </div>
          <span>{cars.length} shown of {carsPage.total}</span>
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
        <AdminPagination
          basePath="/admin/cars/manage"
          page={carsPage.page}
          pageSize={carsPage.pageSize}
          params={pageParams}
          total={carsPage.total}
          totalPages={carsPage.totalPages}
        />
      </section>
    </section>
  );
}
