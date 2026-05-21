"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type {
  CarBodyType,
  CarCondition,
  CarFeatureType,
  CarSaleStatus,
  FuelType,
  StockType,
  TransmissionType,
} from "../../../../lib/generated/prisma/enums";
import AdminImageUpload from "../_components/AdminImageUpload";
import { createCarAction, updateCarAction } from "./actions";
import styles from "../brands/page.module.css";
import {
  bodyTypeOptions,
  conditionOptions,
  featureTypeOptions,
  formatEnumLabel,
  fuelTypeOptions,
  initialCarActionState,
  saleStatusOptions,
  slugifyCar,
  stockTypeOptions,
  transmissionOptions,
} from "./validation";

type BrandOption = {
  id: string;
  name: string;
};

type EditableCarImage = {
  altText: string | null;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
};

type EditableCarFeature = {
  sortOrder: number;
  title: string;
  type: CarFeatureType;
};

type EditableCar = {
  bodyType: CarBodyType;
  brandId: string;
  chassisNumber: string | null;
  condition: CarCondition;
  description: string | null;
  driveTrain: string | null;
  engine: string | null;
  exteriorColor: string | null;
  features: EditableCarFeature[];
  fuelType: FuelType;
  grade: string | null;
  id: string;
  images: EditableCarImage[];
  interiorColor: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  location: string | null;
  mileage: string;
  model: string;
  origin: string | null;
  packageName: string | null;
  price: number;
  saleStatus: CarSaleStatus;
  slug: string;
  stockType: StockType;
  title: string;
  transmission: TransmissionType;
  videoImageUrl: string | null;
  wheelSize: string | null;
  youtubeVideoUrl: string | null;
  year: number;
};

type ImageRow = EditableCarImage & {
  localId: string;
};

type FeatureRow = EditableCarFeature & {
  localId: string;
};

type CarFormProps = {
  brands: BrandOption[];
  car?: EditableCar;
  mode: "create" | "edit";
};

function stableLocalId(prefix: string, index: number, value: string) {
  return `${prefix}-${index}-${slugifyCar(value).slice(0, 48) || "empty"}`;
}

function toImageRows(images: EditableCarImage[]): ImageRow[] {
  return images.map((image, index) => ({
    ...image,
    altText: image.altText ?? "",
    localId: stableLocalId("image", index, image.imageUrl),
  }));
}

function toFeatureRows(features: EditableCarFeature[]): FeatureRow[] {
  return features.map((feature, index) => ({
    ...feature,
    localId: stableLocalId("feature", index, feature.title),
  }));
}

export default function CarForm({ brands, car, mode }: CarFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const localIdCounterRef = useRef(0);
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createCarAction : updateCarAction,
    initialCarActionState,
  );
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [title, setTitle] = useState(car?.title ?? "");
  const [slug, setSlug] = useState(car?.slug ?? "");
  const [brandId, setBrandId] = useState(car?.brandId ?? brands[0]?.id ?? "");
  const [bodyType, setBodyType] = useState<CarBodyType>(car?.bodyType ?? bodyTypeOptions[0]);
  const [fuelType, setFuelType] = useState<FuelType>(car?.fuelType ?? fuelTypeOptions[0]);
  const [transmission, setTransmission] = useState<TransmissionType>(car?.transmission ?? transmissionOptions[0]);
  const [condition, setCondition] = useState<CarCondition>(car?.condition ?? conditionOptions[0]);
  const [stockType, setStockType] = useState<StockType>(car?.stockType ?? stockTypeOptions[0]);
  const [saleStatus, setSaleStatus] = useState<CarSaleStatus>(car?.saleStatus ?? saleStatusOptions[0]);
  const [isFeatured, setIsFeatured] = useState(car?.isFeatured ?? false);
  const [isPublished, setIsPublished] = useState(car?.isPublished ?? false);
  const [images, setImages] = useState<ImageRow[]>(() => toImageRows(car?.images ?? []));
  const [features, setFeatures] = useState<FeatureRow[]>(() => toFeatureRows(car?.features ?? []));

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      formRef.current?.reset();
      setBodyType(bodyTypeOptions[0]);
      setBrandId(brands[0]?.id ?? "");
      setCondition(conditionOptions[0]);
      setFeatures([]);
      setFuelType(fuelTypeOptions[0]);
      setImages([]);
      setIsFeatured(false);
      setIsPublished(false);
      setIsSlugEdited(false);
      setSaleStatus(saleStatusOptions[0]);
      setSlug("");
      setStockType(stockTypeOptions[0]);
      setTitle("");
      setTransmission(transmissionOptions[0]);
    }
  }, [brands, mode, state.status]);

  const imagesJson = useMemo(
    () =>
      JSON.stringify(
        images.map(({ altText, imageUrl, isPrimary, sortOrder }) => ({
          altText,
          imageUrl,
          isPrimary,
          sortOrder,
        })),
      ),
    [images],
  );

  const featuresJson = useMemo(
    () =>
      JSON.stringify(
        features.map(({ sortOrder, title: featureTitle, type }) => ({
          sortOrder,
          title: featureTitle,
          type,
        })),
      ),
    [features],
  );

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!isSlugEdited) {
      setSlug(slugifyCar(value));
    }
  }

  function handleSlugChange(value: string) {
    const nextSlug = slugifyCar(value);
    setIsSlugEdited(Boolean(nextSlug));
    setSlug(nextSlug);
  }

  function createLocalId(prefix: string) {
    localIdCounterRef.current += 1;
    return `${prefix}-new-${localIdCounterRef.current}`;
  }

  function addImageRow() {
    setImages((currentImages) => [
      ...currentImages,
      {
        altText: "",
        imageUrl: "",
        isPrimary: currentImages.length === 0,
        localId: createLocalId("image"),
        sortOrder: currentImages.length,
      },
    ]);
  }

  function updateImageRow(localId: string, updates: Partial<ImageRow>) {
    setImages((currentImages) =>
      currentImages.map((image) => (image.localId === localId ? { ...image, ...updates } : image)),
    );
  }

  function removeImageRow(localId: string) {
    setImages((currentImages) => {
      const nextImages = currentImages.filter((image) => image.localId !== localId);

      if (nextImages.length > 0 && !nextImages.some((image) => image.isPrimary)) {
        return nextImages.map((image, index) => ({ ...image, isPrimary: index === 0 }));
      }

      return nextImages;
    });
  }

  function setPrimaryImage(localId: string) {
    setImages((currentImages) => currentImages.map((image) => ({ ...image, isPrimary: image.localId === localId })));
  }

  function addFeatureRow(type: CarFeatureType) {
    setFeatures((currentFeatures) => [
      ...currentFeatures,
      {
        localId: createLocalId("feature"),
        sortOrder: currentFeatures.length,
        title: "",
        type,
      },
    ]);
  }

  function updateFeatureRow(localId: string, updates: Partial<FeatureRow>) {
    setFeatures((currentFeatures) =>
      currentFeatures.map((feature) => (feature.localId === localId ? { ...feature, ...updates } : feature)),
    );
  }

  function removeFeatureRow(localId: string) {
    setFeatures((currentFeatures) => currentFeatures.filter((feature) => feature.localId !== localId));
  }

  return (
    <form action={formAction} className={`${styles.brandForm} ${styles.carForm}`} ref={formRef}>
      {car ? <input name="id" type="hidden" value={car.id} /> : null}
      <input name="images" type="hidden" value={imagesJson} />
      <input name="features" type="hidden" value={featuresJson} />

      <section className={styles.formSection}>
        <h3>Basic Info</h3>
        <label className={styles.field}>
          <span>Title</span>
          <input name="title" onChange={(event) => handleTitleChange(event.target.value)} placeholder="Toyota Alphard" value={title} />
          {state.errors?.title ? <small>{state.errors.title}</small> : null}
        </label>

        <label className={styles.field}>
          <span>Slug</span>
          <input name="slug" onChange={(event) => handleSlugChange(event.target.value)} placeholder="toyota-alphard" value={slug} />
          {state.errors?.slug ? <small>{state.errors.slug}</small> : null}
        </label>

        <label className={styles.field}>
          <span>Brand</span>
          <select name="brandId" onChange={(event) => setBrandId(event.target.value)} value={brandId}>
            <option value="">Select brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          {state.errors?.brandId ? <small>{state.errors.brandId}</small> : null}
        </label>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Model</span>
            <input name="model" placeholder="2024" defaultValue={car?.model ?? ""} />
            {state.errors?.model ? <small>{state.errors.model}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Year</span>
            <input name="year" placeholder="2024" type="number" defaultValue={car?.year ?? ""} />
            {state.errors?.year ? <small>{state.errors.year}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Price</span>
            <input name="price" placeholder="16900000" type="number" defaultValue={car?.price ?? ""} />
            {state.errors?.price ? <small>{state.errors.price}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Chassis Number</span>
            <input name="chassisNumber" placeholder="ZWR90-1234567" defaultValue={car?.chassisNumber ?? ""} />
            {state.errors?.chassisNumber ? <small>{state.errors.chassisNumber}</small> : null}
          </label>
        </div>

        <label className={styles.field}>
          <span>Mileage</span>
          <input name="mileage" placeholder="8K km" defaultValue={car?.mileage ?? ""} />
          {state.errors?.mileage ? <small>{state.errors.mileage}</small> : null}
        </label>
      </section>

      <section className={styles.formSection}>
        <h3>Specifications</h3>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Body Type</span>
            <select name="bodyType" onChange={(event) => setBodyType(event.target.value as CarBodyType)} value={bodyType}>
              {bodyTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
            {state.errors?.bodyType ? <small>{state.errors.bodyType}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Fuel Type</span>
            <select name="fuelType" onChange={(event) => setFuelType(event.target.value as FuelType)} value={fuelType}>
              {fuelTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
            {state.errors?.fuelType ? <small>{state.errors.fuelType}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Transmission</span>
            <select name="transmission" onChange={(event) => setTransmission(event.target.value as TransmissionType)} value={transmission}>
              {transmissionOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
            {state.errors?.transmission ? <small>{state.errors.transmission}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Condition</span>
            <select name="condition" onChange={(event) => setCondition(event.target.value as CarCondition)} value={condition}>
              {conditionOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
            {state.errors?.condition ? <small>{state.errors.condition}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Stock Type</span>
            <select name="stockType" onChange={(event) => setStockType(event.target.value as StockType)} value={stockType}>
              {stockTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
            {state.errors?.stockType ? <small>{state.errors.stockType}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Sale Status</span>
            <select name="saleStatus" onChange={(event) => setSaleStatus(event.target.value as CarSaleStatus)} value={saleStatus}>
              {saleStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
            {state.errors?.saleStatus ? <small>{state.errors.saleStatus}</small> : null}
          </label>
          <label className={styles.field}>
            <span>Origin</span>
            <input name="origin" placeholder="Japan" defaultValue={car?.origin ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Grade</span>
            <input name="grade" placeholder="Grade 4.5" defaultValue={car?.grade ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Location</span>
            <input name="location" placeholder="Dhaka" defaultValue={car?.location ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Package</span>
            <input name="packageName" placeholder="ZX" defaultValue={car?.packageName ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Exterior Color</span>
            <input name="exteriorColor" placeholder="Pearl White" defaultValue={car?.exteriorColor ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Interior Color</span>
            <input name="interiorColor" placeholder="Black" defaultValue={car?.interiorColor ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Engine</span>
            <input name="engine" placeholder="2500cc" defaultValue={car?.engine ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Drive Train</span>
            <input name="driveTrain" placeholder="2WD" defaultValue={car?.driveTrain ?? ""} />
          </label>
          <label className={styles.field}>
            <span>Wheel Size</span>
            <input name="wheelSize" placeholder="18 Inch Alloy" defaultValue={car?.wheelSize ?? ""} />
            {state.errors?.wheelSize ? <small>{state.errors.wheelSize}</small> : null}
          </label>
        </div>

        <label className={styles.field}>
          <span>Description</span>
          <textarea name="description" placeholder="Vehicle description" defaultValue={car?.description ?? ""} rows={5} />
          {state.errors?.description ? <small>{state.errors.description}</small> : null}
        </label>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeader}>
          <h3>Images</h3>
          <button className={styles.secondaryButton} onClick={addImageRow} type="button">
            Add Image
          </button>
        </div>
        <label className={styles.field}>
          <span>YouTube Video URL</span>
          <input
            name="youtubeVideoUrl"
            placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
            type="url"
            defaultValue={car?.youtubeVideoUrl ?? ""}
          />
          {state.errors?.youtubeVideoUrl ? <small>{state.errors.youtubeVideoUrl}</small> : null}
        </label>
        {car?.videoImageUrl ? <input name="videoImageUrl" type="hidden" value={car.videoImageUrl} /> : null}

        <div className={styles.nestedList}>
          {images.map((image, index) => (
            <div className={styles.nestedItem} key={image.localId}>
              <AdminImageUpload
                folder="cars"
                label={`Car Image ${index + 1}`}
                name={`carImageUpload-${image.localId}`}
                onChange={(url) => updateImageRow(image.localId, { imageUrl: url })}
                value={image.imageUrl}
              />
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Alt Text</span>
                  <input
                    onChange={(event) => updateImageRow(image.localId, { altText: event.target.value })}
                    placeholder="Front exterior"
                    value={image.altText ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>Sort Order</span>
                  <input
                    min="0"
                    onChange={(event) => updateImageRow(image.localId, { sortOrder: Number(event.target.value) })}
                    type="number"
                    value={image.sortOrder}
                  />
                </label>
              </div>
              <label className={styles.checkField}>
                <input checked={image.isPrimary} onChange={() => setPrimaryImage(image.localId)} type="radio" />
                <span>Primary image</span>
              </label>
              <button className={styles.dangerButton} onClick={() => removeImageRow(image.localId)} type="button">
                Remove Image
              </button>
            </div>
          ))}
          {images.length === 0 ? <p className={styles.mutedText}>No car images added yet.</p> : null}
        </div>
        {state.errors?.images ? <p className={styles.formError}>{state.errors.images}</p> : null}
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeader}>
          <h3>Features</h3>
          <div className={styles.rowButtons}>
            <button className={styles.secondaryButton} onClick={() => addFeatureRow("FEATURE")} type="button">
              Add Feature
            </button>
            <button className={styles.secondaryButton} onClick={() => addFeatureRow("SAFETY")} type="button">
              Add Safety
            </button>
          </div>
        </div>
        <div className={styles.nestedList}>
          {features.map((feature) => (
            <div className={styles.nestedItem} key={feature.localId}>
              <div className={styles.featureGrid}>
                <label className={styles.field}>
                  <span>Title</span>
                  <input
                    onChange={(event) => updateFeatureRow(feature.localId, { title: event.target.value })}
                    placeholder="Adaptive cruise control"
                    value={feature.title}
                  />
                </label>
                <label className={styles.field}>
                  <span>Type</span>
                  <select
                    onChange={(event) => updateFeatureRow(feature.localId, { type: event.target.value as CarFeatureType })}
                    value={feature.type}
                  >
                    {featureTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Sort Order</span>
                  <input
                    min="0"
                    onChange={(event) => updateFeatureRow(feature.localId, { sortOrder: Number(event.target.value) })}
                    type="number"
                    value={feature.sortOrder}
                  />
                </label>
              </div>
              <button className={styles.dangerButton} onClick={() => removeFeatureRow(feature.localId)} type="button">
                Remove Feature
              </button>
            </div>
          ))}
          {features.length === 0 ? <p className={styles.mutedText}>No feature items added yet.</p> : null}
        </div>
        {state.errors?.features ? <p className={styles.formError}>{state.errors.features}</p> : null}
      </section>

      <section className={styles.formSection}>
        <h3>Publishing</h3>
        <label className={styles.checkField}>
          <input checked={isPublished} name="isPublished" onChange={(event) => setIsPublished(event.target.checked)} type="checkbox" />
          <span>Car is published</span>
        </label>
        <label className={styles.checkField}>
          <input checked={isFeatured} name="isFeatured" onChange={(event) => setIsFeatured(event.target.checked)} type="checkbox" />
          <span>Car is featured</span>
        </label>
      </section>

      {state.errors?.form || state.errors?.id ? <p className={styles.formError}>{state.errors.form || state.errors.id}</p> : null}
      {state.message ? <p className={state.status === "success" ? styles.formSuccess : styles.formError}>{state.message}</p> : null}

      <button className={styles.primaryButton} disabled={isPending || brands.length === 0} type="submit">
        {isPending ? "Saving..." : mode === "create" ? "Add Car" : "Save Changes"}
      </button>
    </form>
  );
}
