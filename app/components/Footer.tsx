"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { subscribeNewsletterAction } from "../newsletter/actions";
import { initialNewsletterActionState } from "../newsletter/validation";
import { fallbackSiteSettings, type PublicSiteSettings } from "../../lib/siteSettingsConfig";

type FooterProps = {
  className?: string;
  settings?: PublicSiteSettings;
};

function getPhoneHref(phoneNumber: string) {
  const compactPhone = phoneNumber.replace(/[^\d+]/g, "");
  return compactPhone ? `tel:${compactPhone}` : "";
}

const socialLinks = [
  ["Instagram", "instagramUrl", "IG"],
  ["Facebook", "facebookUrl", "FB"],
  ["YouTube", "youtubeUrl", "YT"],
  ["TikTok", "tiktokUrl", "TT"],
  ["LinkedIn", "linkedinUrl", "IN"],
] as const;

// Shared site footer used across all public pages.
export default function Footer({ className = "", settings = fallbackSiteSettings }: FooterProps) {
  const [state, formAction, isPending] = useActionState(subscribeNewsletterAction, initialNewsletterActionState);
  const [newsletter, setNewsletter] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const footerClassName = ["footer", className].filter(Boolean).join(" ");
  const phoneHref = getPhoneHref(settings.phoneNumber);

  useEffect(() => {
    if (state.status === "success" && !state.message.includes("already subscribed")) {
      formRef.current?.reset();
      setNewsletter("");
    }
  }, [state.message, state.status]);

  return (
    <footer className={footerClassName}>
      <div className="footer-main">
        <div className="footer-column">
          <h3>Vehicles</h3>
          <button type="button">SUV</button>
          <button type="button">Sedan</button>
          <button type="button">Wagon</button>
          <button type="button">Crossover</button>
          <button type="button">Passenger Van</button>
        </div>
        <div className="footer-column">
          <h3>Support</h3>
          <button type="button">About Us</button>
          <button type="button">Privacy Policy</button>
          <button type="button">FAQ's & support</button>
          <button type="button">Import Regulations</button>
          <button type="button">Terms & conditions</button>
        </div>
        <div className="footer-column">
          <h3>Recon Imports</h3>
          <a href="/brand-new">Brand New</a>
          <a href="/sell-your-car">Sell Your Car</a>
          <a href="/stock-list.pdf" download>
            Download Stock List
          </a>
          <a href="/send-requirements">Send Your Requirements</a>
          <a href="/verify-auction-sheet">Verify Car Auction Sheet</a>
        </div>
        <div className="footer-newsletter">
          {settings.footerLogo ? (
            <img className="footer-logo" src={settings.footerLogo} alt={`${settings.siteName} footer logo`} suppressHydrationWarning />
          ) : null}
          <h3>Stay updated with Recon Imports</h3>
          <form action={formAction} className="newsletter-form" ref={formRef}>
            <label>
              <input
                aria-invalid={Boolean(state.errors?.email)}
                name="email"
                value={newsletter}
                onChange={(event) => setNewsletter(event.target.value)}
                placeholder="Your Email Address"
                type="email"
                suppressHydrationWarning
              />
              <button disabled={isPending} type="submit">
                {isPending ? "Subscribing..." : "Subscribe"}
              </button>
            </label>
            {state.message ? (
              <p className={state.status === "success" ? "newsletter-success" : "newsletter-error"}>{state.message}</p>
            ) : null}
          </form>
          <div className="footer-contact" aria-label="Contact information">
            {settings.phoneNumber && phoneHref ? <a href={phoneHref}>{settings.phoneNumber}</a> : null}
            {settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}
            {settings.address ? (
              settings.googleMapsUrl ? (
                <a href={settings.googleMapsUrl} target="_blank" rel="noreferrer">
                  {settings.address}
                </a>
              ) : (
                <span>{settings.address}</span>
              )
            ) : null}
          </div>
          <div className="social-links" aria-label="Social links">
            {socialLinks.map(([label, key, text]) =>
              settings[key] ? (
                <a href={settings[key]} aria-label={label} target="_blank" rel="noreferrer" key={key}>
                  {text}
                </a>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <strong>{settings.footerCopyrightText}</strong>
      </div>
    </footer>
  );
}
