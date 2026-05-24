"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitRequirementLeadAction } from "./actions";
import { initialRequirementLeadActionState } from "./formState";

export default function SendRequirementsForm() {
  const [state, formAction, isPending] = useActionState(submitRequirementLeadAction, initialRequirementLeadActionState);
  const [imageCount, setImageCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setImageCount(0);
    }
  }, [state.status]);

  return (
    <form action={formAction} className="sell-car-form" ref={formRef}>
      <h2>Send Your Requirements</h2>
      <input aria-invalid={Boolean(state.errors?.name)} name="name" placeholder="Your Name:" type="text" />
      {state.errors?.name ? <small className="sell-form-error">{state.errors.name}</small> : null}

      <input aria-invalid={Boolean(state.errors?.phone)} name="phone" placeholder="Your Phone Number:" type="tel" />
      {state.errors?.phone ? <small className="sell-form-error">{state.errors.phone}</small> : null}

      <input aria-invalid={Boolean(state.errors?.carName)} name="carName" placeholder="Car Name:" type="text" />
      {state.errors?.carName ? <small className="sell-form-error">{state.errors.carName}</small> : null}

      <div className="sell-form-grid">
        <input aria-invalid={Boolean(state.errors?.model)} name="model" placeholder="Model" type="text" />
        <input aria-invalid={Boolean(state.errors?.modelYear)} name="modelYear" placeholder="Model Year" type="text" />
        <input aria-invalid={Boolean(state.errors?.mileage)} name="mileage" placeholder="Mileage" type="text" />
      </div>
      {state.errors?.model || state.errors?.modelYear || state.errors?.mileage ? (
        <small className="sell-form-error">{state.errors.model || state.errors.modelYear || state.errors.mileage}</small>
      ) : null}

      <input aria-invalid={Boolean(state.errors?.details)} name="details" placeholder="More Details" type="text" />
      {state.errors?.details ? <small className="sell-form-error">{state.errors.details}</small> : null}

      <label className="upload-car-images">
        <input
          multiple
          name="images"
          onChange={(event) => setImageCount(event.target.files?.length ?? 0)}
          type="file"
          accept="image/*"
        />
        <span>{imageCount > 0 ? `${imageCount} image${imageCount === 1 ? "" : "s"} selected` : "Upload Car Images"}</span>
      </label>
      {state.errors?.images ? <small className="sell-form-error">{state.errors.images}</small> : null}

      {state.message ? (
        <p className={state.status === "success" ? "sell-form-success" : "sell-form-error"}>{state.message}</p>
      ) : null}

      <button className="sell-submit" disabled={isPending} type="submit">
        {isPending ? "Submitting..." : "Submit"}
      </button>
      <a className="sell-whatsapp" href="https://wa.me/8801886589009" target="_blank" rel="noreferrer">
        Need More Help? Whatsapp
      </a>
    </form>
  );
}
