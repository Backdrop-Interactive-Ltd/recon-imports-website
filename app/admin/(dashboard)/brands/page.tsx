import { prisma } from "../../../../lib/prisma";
import BrandForm from "./BrandForm";
import BrandRowActions from "./BrandRowActions";
import styles from "./page.module.css";

export const metadata = {
  title: "Brands | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function getBrands() {
  // Brand list reads from Prisma only inside the protected admin panel.
  const brands = await prisma.brand.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
      updatedAt: true,
      _count: {
        select: {
          cars: true,
        },
      },
    },
  });

  return brands.map((brand) => ({
    ...brand,
    updatedAtLabel: dateFormatter.format(brand.updatedAt),
  }));
}

export default async function AdminBrandsPage() {
  const brands = await getBrands();
  const activeBrands = brands.filter((brand) => brand.isActive).length;
  const inactiveBrands = brands.length - activeBrands;

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Catalog</p>
          <h1>Brands</h1>
          <span>Manage showroom brand names, slugs, logos, and active status.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Brands</span>
          <strong>{brands.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeBrands}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveBrands}</strong>
        </div>
      </div>

      <div className={styles.managementGrid}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <p>Add Brand</p>
            <h2>Create a new brand</h2>
          </div>
          <BrandForm mode="create" />
        </section>

        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div>
              <p>Brand List</p>
              <h2>Database brands</h2>
            </div>
            <span>{brands.length} total</span>
          </div>

          {brands.length > 0 ? (
            <div className={styles.brandList}>
              {brands.map((brand) => (
                <article className={styles.brandCard} key={brand.id}>
                  <div className={styles.brandTopline}>
                    <div className={styles.brandIdentity}>
                      <span className={styles.logoBox}>
                        {brand.logoUrl ? <img alt={`${brand.name} logo`} src={brand.logoUrl} /> : getInitials(brand.name)}
                      </span>
                      <div>
                        <h3>{brand.name}</h3>
                        <p>/{brand.slug}</p>
                      </div>
                    </div>
                    <span className={brand.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {brand.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <dl className={styles.brandMeta}>
                    <div>
                      <dt>Cars</dt>
                      <dd>{brand._count.cars}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{brand.updatedAtLabel}</dd>
                    </div>
                    <div>
                      <dt>Logo URL</dt>
                      <dd>{brand.logoUrl || "Not set"}</dd>
                    </div>
                  </dl>

                  <details className={styles.editDetails}>
                    <summary>Edit brand</summary>
                    <BrandForm
                      brand={{
                        id: brand.id,
                        isActive: brand.isActive,
                        logoUrl: brand.logoUrl,
                        name: brand.name,
                        slug: brand.slug,
                      }}
                      mode="edit"
                    />
                  </details>

                  <BrandRowActions
                    brandId={brand.id}
                    brandName={brand.name}
                    carCount={brand._count.cars}
                    isActive={brand.isActive}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No brands yet</strong>
              <p>Create the first brand from the form on this page.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
