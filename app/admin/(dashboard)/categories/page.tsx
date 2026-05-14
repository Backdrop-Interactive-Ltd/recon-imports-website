import type { VehicleCategoryType } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import CategoryForm from "./CategoryForm";
import CategoryRowActions from "./CategoryRowActions";
import styles from "../brands/page.module.css";

export const metadata = {
  title: "Categories | Recon Imports Admin",
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

function formatCategoryType(type: VehicleCategoryType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

async function getCategories() {
  const categories = await prisma.vehicleCategory.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      imageUrl: true,
      isActive: true,
      name: true,
      slug: true,
      sortOrder: true,
      type: true,
      updatedAt: true,
    },
  });

  return categories.map((category) => ({
    ...category,
    typeLabel: formatCategoryType(category.type),
    updatedAtLabel: dateFormatter.format(category.updatedAt),
  }));
}

export default async function AdminCategoriesPage() {
  const categories = await getCategories();
  const activeCategories = categories.filter((category) => category.isActive).length;
  const inactiveCategories = categories.length - activeCategories;

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Catalog</p>
          <h1>Categories</h1>
          <span>Manage vehicle category names, slugs, images, types, sort order, and active status.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Categories</span>
          <strong>{categories.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeCategories}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveCategories}</strong>
        </div>
      </div>

      <div className={styles.managementGrid}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <p>Add Category</p>
            <h2>Create a new category</h2>
          </div>
          <CategoryForm mode="create" />
        </section>

        <section className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div>
              <p>Category List</p>
              <h2>Database categories</h2>
            </div>
            <span>{categories.length} total</span>
          </div>

          {categories.length > 0 ? (
            <div className={styles.brandList}>
              {categories.map((category) => (
                <article className={styles.brandCard} key={category.id}>
                  <div className={styles.brandTopline}>
                    <div className={styles.brandIdentity}>
                      <span className={styles.logoBox}>
                        {category.imageUrl ? <img alt={`${category.name} category`} src={category.imageUrl} /> : getInitials(category.name)}
                      </span>
                      <div>
                        <h3>{category.name}</h3>
                        <p>/{category.slug}</p>
                      </div>
                    </div>
                    <span className={category.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <dl className={styles.brandMeta}>
                    <div>
                      <dt>Type</dt>
                      <dd>{category.typeLabel}</dd>
                    </div>
                    <div>
                      <dt>Sort</dt>
                      <dd>{category.sortOrder}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{category.updatedAtLabel}</dd>
                    </div>
                  </dl>

                  <dl className={styles.brandMeta}>
                    <div>
                      <dt>Image URL</dt>
                      <dd>{category.imageUrl || "Not set"}</dd>
                    </div>
                  </dl>

                  <details className={styles.editDetails}>
                    <summary>Edit category</summary>
                    <CategoryForm
                      category={{
                        id: category.id,
                        imageUrl: category.imageUrl,
                        isActive: category.isActive,
                        name: category.name,
                        slug: category.slug,
                        sortOrder: category.sortOrder,
                        type: category.type,
                      }}
                      mode="edit"
                    />
                  </details>

                  <CategoryRowActions categoryId={category.id} categoryName={category.name} isActive={category.isActive} />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No categories yet</strong>
              <p>Create the first category from the form on this page.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
