"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitSellCarLeadAction } from "./actions";
import { initialSellCarLeadActionState } from "./formState";

export default function SellYourCarForm() {
  const [state, formAction, isPending] = useActionState(submitSellCarLeadAction, initialSellCarLeadActionState);
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
      <h2>Ready to sell your car?</h2>
      <input aria-invalid={Boolean(state.errors?.name)} name="name" placeholder="Your Name:" type="text" />
      {state.errors?.name ? <small className="sell-form-error">{state.errors.name}</small> : null}

      <input aria-invalid={Boolean(state.errors?.phone)} name="phone" placeholder="Your Phone Number:" type="tel" />
      {state.errors?.phone ? <small className="sell-form-error">{state.errors.phone}</small> : null}

      <input aria-invalid={Boolean(state.errors?.carName)} name="carName" placeholder="Car Name:" type="text" />
      {state.errors?.carName ? <small className="sell-form-error">{state.errors.carName}</small> : null}

      <div className="sell-form-grid">
        <input aria-invalid={Boolean(state.errors?.model)} name="model" placeholder="Model" type="text" />
        <input
          aria-invalid={Boolean(state.errors?.registrationYear)}
          name="registrationYear"
          placeholder="Reg. Year"
          type="text"
        />
        <input aria-invalid={Boolean(state.errors?.mileage)} name="mileage" placeholder="Mileage" type="text" />
      </div>
      {state.errors?.model || state.errors?.registrationYear || state.errors?.mileage ? (
        <small className="sell-form-error">{state.errors.model || state.errors.registrationYear || state.errors.mileage}</small>
      ) : null}

      <input aria-invalid={Boolean(state.errors?.offeredPrice)} name="offeredPrice" placeholder="Offered Price" type="text" />
      {state.errors?.offeredPrice ? <small className="sell-form-error">{state.errors.offeredPrice}</small> : null}

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

      <label className="sell-terms-row">
        <input name="terms" type="checkbox" />
        <span>
          I accept and agree to the <a href="#">Terms Of Use</a>
        </span>
      </label>
      {state.errors?.terms ? <small className="sell-form-error">{state.errors.terms}</small> : null}

      {state.message ? (
        <p className={state.status === "success" ? "sell-form-success" : "sell-form-error"}>{state.message}</p>
      ) : null}

      <button className="sell-submit" disabled={isPending} type="submit">
        {isPending ? "Submitting..." : "Submit"}
      </button>
      <a className="sell-whatsapp" href="https://wa.me/8801886589009" target="_blank" rel="noreferrer">
        Need More Details? Whatsapp
      </a>
    </form>
  );
}
