"use client";

import { useActionState, useEffect, useState } from "react";
import AdminImageUpload from "../_components/AdminImageUpload";
import { createBrandAction, updateBrandAction } from "./actions";
import styles from "./page.module.css";
import { initialBrandActionState, slugifyBrand } from "./formOptions";

type EditableBrand = {
  id: string;
  isActive: boolean;
  logoUrl: string | null;
  name: string;
  slug: string;
};

type BrandFormProps = {
  brand?: EditableBrand;
  mode: "create" | "edit";
};

export default function BrandForm({ brand, mode }: BrandFormProps) {
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createBrandAction : updateBrandAction,
    initialBrandActionState,
  );
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? "");
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      setIsActive(true);
      setIsSlugEdited(false);
      setLogoUrl("");
      setName("");
      setSlug("");
    }
  }, [mode, state.status]);

  function handleNameChange(value: string) {
    setName(value);

    if (!isSlugEdited) {
      setSlug(slugifyBrand(value));
    }
  }

  function handleSlugChange(value: string) {
    setIsSlugEdited(true);
    setSlug(slugifyBrand(value));
  }

  return (
    <form action={formAction} className={styles.brandForm}>
      {brand ? <input name="id" type="hidden" value={brand.id} /> : null}

      <label className={styles.field}>
        <span>Name</span>
        <input
          name="name"
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder="Toyota"
          type="text"
          value={name}
        />
        {state.errors?.name ? <small>{state.errors.name}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Slug</span>
        <input
          name="slug"
          onChange={(event) => handleSlugChange(event.target.value)}
          placeholder="toyota"
          type="text"
          value={slug}
        />
        {state.errors?.slug ? <small>{state.errors.slug}</small> : null}
      </label>

      <AdminImageUpload
        error={state.errors?.logoUrl}
        folder="brands"
        label="Logo Image"
        name="logoUrl"
        onChange={setLogoUrl}
        value={logoUrl}
      />

      <label className={styles.checkField}>
        <input checked={isActive} name="isActive" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
        <span>Brand is active</span>
      </label>

      {state.errors?.form || state.errors?.id ? <p className={styles.formError}>{state.errors.form || state.errors.id}</p> : null}
      {state.message ? <p className={state.status === "success" ? styles.formSuccess : styles.formError}>{state.message}</p> : null}

      <button className={styles.primaryButton} disabled={isPending} type="submit">
        {isPending ? "Saving..." : mode === "create" ? "Add Brand" : "Save Changes"}
      </button>
    </form>
  );
}
