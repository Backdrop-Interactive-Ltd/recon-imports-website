"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { HomepageHeroSlide } from "../../homeTypes";

type HeroSliderProps = {
  heroSlides: HomepageHeroSlide[];
};

export default function HeroSlider({ heroSlides }: HeroSliderProps) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  function nextSlide() {
    setSlide((current) => (current + 1) % heroSlides.length);
  }

  function previousSlide() {
    setSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  }

  return (
    <section className="hero" aria-label="Featured vehicles">
      <div className="hero-banner-track">
        {heroSlides.map((heroSlide, index) => (
          <div className={index === slide ? "hero-slide active" : "hero-slide"} key={heroSlide.title}>
            <Image
              className={`hero-image ${heroSlide.imageClass}`}
              src={heroSlide.image}
              alt={heroSlide.title}
              fill
              priority={index === 0}
              sizes="100vw"
              suppressHydrationWarning
            />
          </div>
        ))}
      </div>
      <div className={`hero-title ${heroSlides[slide].textAnimation}`} key={heroSlides[slide].title}>
        {heroSlides[slide].title}
      </div>
      <div className="hero-controls">
        <button type="button" aria-label="Previous slide" onClick={previousSlide}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Next slide" onClick={nextSlide}>
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
