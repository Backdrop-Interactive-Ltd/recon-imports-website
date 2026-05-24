"use client";

import { useActionState, useEffect, useState } from "react";
import type { VehicleCategoryType } from "../../../../lib/generated/prisma/enums";
import AdminImageUpload from "../_components/AdminImageUpload";
import { createCategoryAction, updateCategoryAction } from "./actions";
import styles from "../brands/page.module.css";
import { categoryTypeOptions, initialCategoryActionState, slugifyCategory } from "./formOptions";

type EditableCategory = {
  description: string | null;
  iconKey: string | null;
  id: string;
  imageAlt: string | null;
  imageUrl: string | null;
  isActive: boolean;
  name: string;
  routePath: string | null;
  showOnHomepage: boolean;
  slug: string;
  sortOrder: number;
  type: VehicleCategoryType;
};

type CategoryFormProps = {
  category?: EditableCategory;
  mode: "create" | "edit";
};

function formatCategoryType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default function CategoryForm({ category, mode }: CategoryFormProps) {
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createCategoryAction : updateCategoryAction,
    initialCategoryActionState,
  );
  const [description, setDescription] = useState(category?.description ?? "");
  const [iconKey, setIconKey] = useState(category?.iconKey ?? "");
  const [imageAlt, setImageAlt] = useState(category?.imageAlt ?? "");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isRoutePathEdited, setIsRoutePathEdited] = useState(Boolean(category?.routePath));
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [name, setName] = useState(category?.name ?? "");
  const [routePath, setRoutePath] = useState(category?.routePath ?? (category?.slug ? `/${category.slug}` : ""));
  const [showOnHomepage, setShowOnHomepage] = useState(category?.showOnHomepage ?? true);
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [type, setType] = useState<VehicleCategoryType>(category?.type ?? categoryTypeOptions[0]);

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      setDescription("");
      setIconKey("");
      setImageAlt("");
      setImageUrl("");
      setIsActive(true);
      setIsRoutePathEdited(false);
      setIsSlugEdited(false);
      setName("");
      setRoutePath("");
      setShowOnHomepage(true);
      setSlug("");
      setSortOrder("0");
      setType(categoryTypeOptions[0]);
    }
  }, [mode, state.status]);

  function handleNameChange(value: string) {
    setName(value);

    if (!isSlugEdited) {
      const nextSlug = slugifyCategory(value);
      setSlug(nextSlug);

      if (!isRoutePathEdited) {
        setRoutePath(nextSlug ? `/${nextSlug}` : "");
      }
    }
  }

  function handleSlugChange(value: string) {
    setIsSlugEdited(true);
    const nextSlug = slugifyCategory(value);
    setSlug(nextSlug);

    if (!isRoutePathEdited) {
      setRoutePath(nextSlug ? `/${nextSlug}` : "");
    }
  }

  function handleRoutePathChange(value: string) {
    setIsRoutePathEdited(true);
    setRoutePath(value);
  }

  return (
    <form action={formAction} className={styles.brandForm}>
      {category ? <input name="id" type="hidden" value={category.id} /> : null}

      <label className={styles.field}>
        <span>Name</span>
        <input
          name="name"
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder="SUV"
          type="text"
          value={name}
        />
        {state.errors?.name ? <small>{state.errors.name}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Description / Short Copy</span>
        <textarea
          name="description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Spacious and versatile for power and adventure."
          value={description}
        />
        {state.errors?.description ? <small>{state.errors.description}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Slug</span>
        <input
          name="slug"
          onChange={(event) => handleSlugChange(event.target.value)}
          placeholder="suv"
          type="text"
          value={slug}
        />
        {state.errors?.slug ? <small>{state.errors.slug}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Route Path / Href</span>
        <input
          name="routePath"
          onChange={(event) => handleRoutePathChange(event.target.value)}
          placeholder="/suv"
          type="text"
          value={routePath}
        />
        {state.errors?.routePath ? <small>{state.errors.routePath}</small> : null}
      </label>

      <AdminImageUpload
        error={state.errors?.imageUrl}
        folder="categories"
        label="Category Image"
        name="imageUrl"
        onChange={setImageUrl}
        value={imageUrl}
      />

      <label className={styles.field}>
        <span>Image Alt Text</span>
        <input
          name="imageAlt"
          onChange={(event) => setImageAlt(event.target.value)}
          placeholder="SUV vehicle detail"
          type="text"
          value={imageAlt}
        />
        {state.errors?.imageAlt ? <small>{state.errors.imageAlt}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Icon Key</span>
        <input
          name="iconKey"
          onChange={(event) => setIconKey(event.target.value)}
          placeholder="car"
          type="text"
          value={iconKey}
        />
        {state.errors?.iconKey ? <small>{state.errors.iconKey}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Type</span>
        <select name="type" onChange={(event) => setType(event.target.value as VehicleCategoryType)} value={type}>
          {categoryTypeOptions.map((option) => (
            <option key={option} value={option}>
              {formatCategoryType(option)}
            </option>
          ))}
        </select>
        {state.errors?.type ? <small>{state.errors.type}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Sort Order</span>
        <input
          min="0"
          name="sortOrder"
          onChange={(event) => setSortOrder(event.target.value)}
          placeholder="0"
          type="number"
          value={sortOrder}
        />
        {state.errors?.sortOrder ? <small>{state.errors.sortOrder}</small> : null}
      </label>

      <label className={styles.checkField}>
        <input checked={isActive} name="isActive" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
        <span>Category is active</span>
      </label>

      <label className={styles.checkField}>
        <input
          checked={showOnHomepage}
          name="showOnHomepage"
          onChange={(event) => setShowOnHomepage(event.target.checked)}
          type="checkbox"
        />
        <span>Show on homepage</span>
      </label>

      {state.errors?.form || state.errors?.id ? <p className={styles.formError}>{state.errors.form || state.errors.id}</p> : null}
      {state.message ? <p className={state.status === "success" ? styles.formSuccess : styles.formError}>{state.message}</p> : null}

      <button className={styles.primaryButton} disabled={isPending} type="submit">
        {isPending ? "Saving..." : mode === "create" ? "Add Category" : "Save Changes"}
      </button>
    </form>
  );
}
