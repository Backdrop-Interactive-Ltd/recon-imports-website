"use client";

import { Check, Info, Search } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitAuctionSheetRequestAction } from "./actions";
import { auctionSheetReportFee } from "./constants";
import { initialAuctionSheetRequestActionState, paymentMethodOptions } from "./formOptions";
import type { PublicSiteSettings } from "../../lib/siteSettingsConfig";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN").format(amount);
}

type VerifyAuctionSheetFormProps = {
  paymentAccounts: Pick<
    PublicSiteSettings,
    "bankTransferAccount" | "bkashPaymentNumber" | "nagadPaymentNumber" | "rocketPaymentNumber"
  >;
};

const fallbackPaymentAccount = "Payment number/account will be confirmed by Recon Imports after submission.";

function getPaymentAccount(paymentAccounts: VerifyAuctionSheetFormProps["paymentAccounts"], paymentMethod: string) {
  if (paymentMethod === "bKash") return paymentAccounts.bkashPaymentNumber || fallbackPaymentAccount;
  if (paymentMethod === "Nagad") return paymentAccounts.nagadPaymentNumber || fallbackPaymentAccount;
  if (paymentMethod === "Rocket") return paymentAccounts.rocketPaymentNumber || fallbackPaymentAccount;
  if (paymentMethod === "Bank Transfer") return paymentAccounts.bankTransferAccount || fallbackPaymentAccount;
  return fallbackPaymentAccount;
}

export default function VerifyAuctionSheetForm({ paymentAccounts }: VerifyAuctionSheetFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitAuctionSheetRequestAction,
    initialAuctionSheetRequestActionState,
  );
  const [agreed, setAgreed] = useState(false);
  const [chassis, setChassis] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodOptions)[number]>("bKash");
  const [phone, setPhone] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const canProceed = useMemo(() => {
    return chassis.trim() && name.trim() && phone.trim() && email.trim() && paymentMethod && senderNumber.trim() && transactionId.trim() && agreed;
  }, [agreed, chassis, email, name, paymentMethod, phone, senderNumber, transactionId]);

  const paymentAccount = getPaymentAccount(paymentAccounts, paymentMethod);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setAgreed(false);
      setChassis("");
      setEmail("");
      setName("");
      setPaymentMethod("bKash");
      setPhone("");
      setSenderNumber("");
      setTransactionId("");
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

          <div className="payment-instructions">
            <strong>Amount: BDT {formatCurrency(auctionSheetReportFee)}</strong>
            <span>{paymentMethod} payment number/account:</span>
            <p>{paymentAccount}</p>
          </div>

          <div className="field-stack payment-fields">
            <select
              aria-invalid={Boolean(state.errors?.paymentMethod)}
              name="paymentMethod"
              onChange={(event) => setPaymentMethod(event.target.value as (typeof paymentMethodOptions)[number])}
              value={paymentMethod}
            >
              {paymentMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            {state.errors?.paymentMethod ? <small className="verify-form-error">{state.errors.paymentMethod}</small> : null}

            <input
              aria-invalid={Boolean(state.errors?.senderNumber)}
              name="senderNumber"
              onChange={(event) => setSenderNumber(event.target.value)}
              placeholder="Sender Number"
              type="tel"
              value={senderNumber}
            />
            {state.errors?.senderNumber ? <small className="verify-form-error">{state.errors.senderNumber}</small> : null}

            <input
              aria-invalid={Boolean(state.errors?.transactionId)}
              name="transactionId"
              onChange={(event) => setTransactionId(event.target.value)}
              placeholder="Transaction ID"
              value={transactionId}
            />
            {state.errors?.transactionId ? <small className="verify-form-error">{state.errors.transactionId}</small> : null}
          </div>

          {state.message ? (
            <p className={state.status === "success" ? "verify-form-success" : "verify-form-error"}>{state.message}</p>
          ) : null}

          <button className="payment-button" type="submit" disabled={!canProceed || isPending}>
            {isPending ? "Submitting..." : "Submit for Manual Verification"}
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
