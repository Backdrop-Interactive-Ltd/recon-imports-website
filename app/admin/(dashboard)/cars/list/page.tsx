import Link from "next/link";
import CarsSubnav from "../CarsSubnav";
import { formatEnumLabel, saleStatusOptions, stockTypeOptions } from "../validation";
import { formatCarPrice, getAdminCars, getCarBrands, type AdminCarListFilters } from "../queries";
import styles from "../../brands/page.module.css";

export const metadata = {
  title: "Cars List | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function CarsListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: AdminCarListFilters = {
    brandId: getStringParam(params.brandId),
    featured: getStringParam(params.featured),
    published: getStringParam(params.published),
    saleStatus: getStringParam(params.saleStatus),
    sort: getStringParam(params.sort),
    stockType: getStringParam(params.stockType),
  };
  const [brands, cars] = await Promise.all([getCarBrands(), getAdminCars(filters)]);

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Inventory</p>
          <h1>Cars List</h1>
          <span>Review inventory in a compact list with status, type, brand, price, and year filters.</span>
        </div>
      </div>

      <CarsSubnav />

      <section className={styles.listPanel}>
        <form className={styles.filterBar} method="get">
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
              <option value="">Default</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
              <option value="year-asc">Year old to new</option>
              <option value="year-desc">Year new to old</option>
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Apply
          </button>
          <Link className={styles.secondaryLinkButton} href="/admin/cars/list">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Car List</p>
            <h2>Database inventory</h2>
          </div>
          <span>{cars.length} shown</span>
        </div>

        {cars.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Brand</th>
                  <th>Stock Type</th>
                  <th>Condition</th>
                  <th>Price</th>
                  <th>Year</th>
                  <th>Published</th>
                  <th>Featured</th>
                  <th>Sale</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car.id}>
                    <td>
                      <strong>{car.title}</strong>
                      <span>/{car.slug}</span>
                    </td>
                    <td>{car.brand.name}</td>
                    <td>{car.stockTypeLabel}</td>
                    <td>{car.conditionLabel}</td>
                    <td>{formatCarPrice(car.price)}</td>
                    <td>{car.year}</td>
                    <td>{car.isPublished ? "Published" : "Unpublished"}</td>
                    <td>{car.isFeatured ? "Featured" : "No"}</td>
                    <td>{car.saleStatusLabel}</td>
                    <td>
                      <Link href={`/admin/cars/manage/${car.id}`}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No cars found</strong>
            <p>Adjust the filters or add a new car.</p>
          </div>
        )}
      </section>
    </section>
  );
}
