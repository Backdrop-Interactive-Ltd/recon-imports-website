import CarForm from "../../CarForm";
import CarsSubnav from "../../CarsSubnav";
import { getAdminCarById, getCarBrands } from "../../queries";
import styles from "../../../brands/page.module.css";

export const metadata = {
  title: "Edit Car | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [brands, car] = await Promise.all([getCarBrands(), getAdminCarById(id)]);

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Inventory</p>
          <h1>Edit Car</h1>
          <span>Update one car at a time, including images, features, YouTube video, wheel size, and publishing.</span>
        </div>
      </div>

      <CarsSubnav />

      <section className={styles.formPanel}>
        <div className={styles.panelHeader}>
          <p>Edit Car</p>
          <h2>{car.title}</h2>
        </div>
        <CarForm
          brands={brands}
          car={{
            bodyType: car.bodyType,
            brandId: car.brandId,
            chassisNumber: car.chassisNumber,
            condition: car.condition,
            description: car.description,
            driveTrain: car.driveTrain,
            engine: car.engine,
            exteriorColor: car.exteriorColor,
            features: car.features,
            fuelType: car.fuelType,
            grade: car.grade,
            id,
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
            saleStatus: car.saleStatus,
            slug: car.slug,
            stockType: car.stockType,
            title: car.title,
            transmission: car.transmission,
            videoImageUrl: car.videoImageUrl,
            wheelSize: car.wheelSize,
            youtubeVideoUrl: car.youtubeVideoUrl,
            year: car.year,
          }}
          mode="edit"
        />
      </section>
    </section>
  );
}
