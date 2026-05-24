"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HomepageBrand } from "../../homeTypes";
import PublicLogoImage from "../PublicLogoImage";

const preferenceOptions = [
  {
    title: "Reconditioned Unit",
    href: "/reconditioned",
    image: "/hero-slide-2.webp",
  },
  {
    title: "Pre-owned Unit",
    href: "/pre-owned",
    image: "/hero-slide-3.webp",
  },
  {
    title: "Pre-Order Unit",
    href: "/pre-order",
    image: "/cat-crossover.webp",
  },
];

type BrandShowcaseProps = {
  brands: HomepageBrand[];
};

export default function BrandShowcase({ brands }: BrandShowcaseProps) {
  const [brandSlide, setBrandSlide] = useState(0);
  const brandLogoPages = useMemo(
    () => Array.from({ length: Math.ceil(brands.length / 9) }, (_, index) => brands.slice(index * 9, index * 9 + 9)),
    [brands],
  );

  useEffect(() => {
    if (brandLogoPages.length <= 1) return;

    const interval = window.setInterval(() => {
      setBrandSlide((current) => (current + 1) % brandLogoPages.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, [brandLogoPages.length]);

  return (
    <section className="preference-section" aria-labelledby="preference-heading">
      <h2 id="preference-heading">Choose per your preference</h2>
      <div className="preference-grid">
        {preferenceOptions.map((option) => (
          <a className="preference-card" href={option.href} key={option.title}>
            <Image src={option.image} alt={option.title} fill sizes="(max-width: 860px) 100vw, 33vw" suppressHydrationWarning />
            <span>{option.title}</span>
            <i aria-hidden="true">
              <ArrowUpRight size={24} />
            </i>
          </a>
        ))}
      </div>

      <div className="brand-logo-slider" aria-label="Available brands">
        <div className="brand-logo-track" style={{ transform: `translateX(-${brandSlide * 100}%)` }}>
          {brandLogoPages.map((brandPage, pageIndex) => (
            <div className="brand-logo-page" key={`brand-page-${pageIndex}`}>
              {brandPage.map((brand) => (
                <a className="brand-logo-card" href={`/${brand.slug}`} key={brand.slug}>
                  {brand.logoUrl ? (
                    <PublicLogoImage
                      className="brand-logo-image"
                      src={brand.logoUrl}
                      alt={`${brand.name} logo`}
                      width={220}
                      height={120}
                      loading="lazy"
                      sizes="110px"
                    />
                  ) : (
                    <span>{brand.name}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="brand-logo-dots" aria-hidden="true">
        {brandLogoPages.map((_, index) => (
          <span className={index === brandSlide ? "active" : ""} key={`brand-dot-${index}`} />
        ))}
      </div>

      <section className="consult-banner" aria-label="Connect to consult">
        <Image src="/hero-slide-1.webp" alt="" fill sizes="100vw" suppressHydrationWarning />
        <div className="consult-copy">
          <h2>Connect to Consult</h2>
          <p>
            Our expert sales team is here to assist you to choose your vehicle according to your necessity, choice and
            preference.
          </p>
          <a href="https://calendly.com/reconimportsltd/30min" target="_blank" rel="noreferrer">
            Book An Appointment
          </a>
        </div>
      </section>
    </section>
  );
}
