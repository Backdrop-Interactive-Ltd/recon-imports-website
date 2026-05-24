"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import AdminImageUpload from "../_components/AdminImageUpload";
import styles from "../brands/page.module.css";
import { createHeroSlideAction, updateHeroSlideAction } from "./actions";
import { initialHeroSlideActionState } from "./formState";

type EditableHeroSlide = {
  ctaLink: string | null;
  ctaText: string | null;
  id: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  subtitle: string | null;
  title: string;
};

type HeroSlideFormProps = {
  mode: "create" | "edit";
  slide?: EditableHeroSlide;
};

export default function HeroSlideForm({ mode, slide }: HeroSlideFormProps) {
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createHeroSlideAction : updateHeroSlideAction,
    initialHeroSlideActionState,
  );
  const [imageUrl, setImageUrl] = useState(slide?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      formRef.current?.reset();
      setImageUrl("");
      setIsActive(true);
    }
  }, [mode, state.status]);

  return (
    <form action={formAction} className={styles.brandForm} ref={formRef}>
      {slide ? <input name="id" type="hidden" value={slide.id} /> : null}

      <label className={styles.field}>
        <span>Title</span>
        <input name="title" placeholder="Explore a world of affordable options" type="text" defaultValue={slide?.title ?? ""} />
        {state.errors?.title ? <small>{state.errors.title}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Subtitle</span>
        <textarea name="subtitle" placeholder="Optional supporting text" defaultValue={slide?.subtitle ?? ""} rows={3} />
        {state.errors?.subtitle ? <small>{state.errors.subtitle}</small> : null}
      </label>

      <AdminImageUpload
        error={state.errors?.imageUrl}
        folder="hero"
        label="Hero Image"
        name="imageUrl"
        onChange={setImageUrl}
        value={imageUrl}
      />

      <label className={styles.field}>
        <span>CTA Text</span>
        <input name="ctaText" placeholder="View Stock" type="text" defaultValue={slide?.ctaText ?? ""} />
        {state.errors?.ctaText ? <small>{state.errors.ctaText}</small> : null}
      </label>

      <label className={styles.field}>
        <span>CTA Link</span>
        <input name="ctaLink" placeholder="/brand-new" type="text" defaultValue={slide?.ctaLink ?? ""} />
        {state.errors?.ctaLink ? <small>{state.errors.ctaLink}</small> : null}
      </label>

      <label className={styles.field}>
        <span>Sort Order</span>
        <input min="0" name="sortOrder" type="number" defaultValue={slide?.sortOrder ?? 0} />
        {state.errors?.sortOrder ? <small>{state.errors.sortOrder}</small> : null}
      </label>

      <label className={styles.checkField}>
        <input checked={isActive} name="isActive" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
        <span>Hero slide is active</span>
      </label>

      {state.errors?.form || state.errors?.id ? <p className={styles.formError}>{state.errors.form || state.errors.id}</p> : null}
      {state.message ? <p className={state.status === "success" ? styles.formSuccess : styles.formError}>{state.message}</p> : null}

      <button className={styles.primaryButton} disabled={isPending} type="submit">
        {isPending ? "Saving..." : mode === "create" ? "Add Hero Slide" : "Save Changes"}
      </button>
    </form>
  );
}
