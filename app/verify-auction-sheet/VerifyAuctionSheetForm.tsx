"use client";

import { Check, Info, Search } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitAuctionSheetRequestAction } from "./actions";
import { auctionSheetReportFee } from "./constants";
import { initialAuctionSheetRequestActionState } from "./validation";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN").format(amount);
}

export default function VerifyAuctionSheetForm() {
  const [state, formAction, isPending] = useActionState(
    submitAuctionSheetRequestAction,
    initialAuctionSheetRequestActionState,
  );
  const [agreed, setAgreed] = useState(false);
  const [chassis, setChassis] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const canProceed = useMemo(() => {
    return chassis.trim() && name.trim() && phone.trim() && email.trim() && agreed;
  }, [agreed, chassis, email, name, phone]);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setAgreed(false);
      setChassis("");
      setEmail("");
      setName("");
      setPhone("");
    }
  }, [state.status]);

  return (
    <section className="verify-order-layout" aria-label="Verify auction sheet order form">
      <form action={formAction} className="verify-form-stack" ref={formRef}>
        <section className="verify-panel lookup-panel">
          <h1>Vehicle Lookup</h1>
          <div className="lookup-row">
            <input
              aria-invalid={Boolean(state.errors?.chassisNumber)}
              aria-label="Enter Chassis Number"
              name="chassisNumber"
              onChange={(event) => setChassis(event.target.value)}
              placeholder="Enter Chassis Number"
              value={chassis}
            />
            <button type="button">
              <Search size={19} />
              Search
            </button>
          </div>
          {state.errors?.chassisNumber ? <small className="verify-form-error">{state.errors.chassisNumber}</small> : null}
          <p className="lookup-help">
            <Info size={15} />
            <span>
              To verify auction sheet, please enter your chassis number.
              <br />
              (Example: NZE141-6048723)
            </span>
          </p>
        </section>

        <section className="verify-panel checkout-panel">
          <div className="step-heading">
            <span>1</span>
            <h2>Your Information</h2>
          </div>

          <div className="field-stack">
            <input
              aria-invalid={Boolean(state.errors?.name)}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              value={name}
            />
            {state.errors?.name ? <small className="verify-form-error">{state.errors.name}</small> : null}
            <input
              aria-invalid={Boolean(state.errors?.phone)}
              name="phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone Number"
              value={phone}
            />
            {state.errors?.phone ? <small className="verify-form-error">{state.errors.phone}</small> : null}
            <input
              aria-invalid={Boolean(state.errors?.email)}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              type="email"
              value={email}
            />
            {state.errors?.email ? <small className="verify-form-error">{state.errors.email}</small> : null}
          </div>

          <div className="step-heading payment-heading">
            <span>2</span>
            <h2>Payment</h2>
          </div>

          <div className="payment-option">
            <span>Pay BDT {formatCurrency(auctionSheetReportFee)}</span>
            <span className="payment-marks" aria-label="Accepted card payment methods">
              <span className="card-mark mastercard" />
              <span>VISA</span>
              <span className="card-mark amex" />
            </span>
          </div>

          {state.message ? (
            <p className={state.status === "success" ? "verify-form-success" : "verify-form-error"}>{state.message}</p>
          ) : null}

          <button className="payment-button" type="submit" disabled={!canProceed || isPending}>
            {isPending ? "Submitting..." : "Proceed to Payment"}
          </button>

          <label className="terms-row">
            <input checked={agreed} name="terms" onChange={(event) => setAgreed(event.target.checked)} type="checkbox" />
            <span>I agree to the Terms & Conditions and understand that the report fee is non-refundable.</span>
          </label>
          {state.errors?.terms ? <small className="verify-form-error">{state.errors.terms}</small> : null}
        </section>
      </form>

      <aside className="order-summary" aria-label="Order summary">
        <h2>Order Summary</h2>
        <div className="summary-card">
          <div>
            <span>Auction Report Fee</span>
            <strong>BDT {formatCurrency(auctionSheetReportFee)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>BDT {formatCurrency(auctionSheetReportFee)}</strong>
          </div>
        </div>

        <div className="benefits-card">
          <h3>What You'll Get</h3>
          <ul>
            <li>
              <Check size={14} />
              Complete auction sheet with all details
            </li>
            <li>
              <Check size={14} />
              High-resolution auction images
            </li>
            <li>
              <Check size={14} />
              Verified vehicle history
            </li>
          </ul>
        </div>
      </aside>
    </section>
  );
}
