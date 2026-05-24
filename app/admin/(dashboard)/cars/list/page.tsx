import Link from "next/link";
import AdminPagination from "../../_components/AdminPagination";
import { getStringParam } from "../../_components/listParams";
import CarsSubnav from "../CarsSubnav";
import { formatEnumLabel, saleStatusOptions, stockTypeOptions } from "../formOptions";
import { formatCarPrice, getAdminCars, getCarBrands, type AdminCarListFilters } from "../queries";
import styles from "../../brands/page.module.css";

export const metadata = {
  title: "Cars List | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

export default async function CarsListPage({
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
          <h1>Cars List</h1>
          <span>Review inventory in a compact list with status, type, brand, price, and year filters.</span>
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
          <Link className={styles.secondaryLinkButton} href="/admin/cars/list">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Car List</p>
            <h2>Database inventory</h2>
          </div>
          <span>{cars.length} shown of {carsPage.total}</span>
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
        <AdminPagination
          basePath="/admin/cars/list"
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
