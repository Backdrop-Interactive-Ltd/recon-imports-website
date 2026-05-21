import CarForm from "../CarForm";
import CarsSubnav from "../CarsSubnav";
import { getCarBrands } from "../queries";
import styles from "../../brands/page.module.css";

export const metadata = {
  title: "Add Car | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

export default async function AddCarPage() {
  const brands = await getCarBrands();

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Inventory</p>
          <h1>Add Cars</h1>
          <span>Create a new car inventory item without the clutter of the full car list.</span>
        </div>
      </div>

      <CarsSubnav />

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
    </section>
  );
}
