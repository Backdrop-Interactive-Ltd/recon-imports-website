"use client";

import Image from "next/image";
import { BusFront, Car, CarFront, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HomepageCategory } from "../../homeTypes";

const categoryIconByKey: Record<string, typeof Car> = {
  bus: BusFront,
  car: Car,
  crossover: CarFront,
  mpv: BusFront,
  "passenger-van": BusFront,
  sedan: CarFront,
  suv: Truck,
  truck: Truck,
  van: BusFront,
};

type PurposeCategoryCarouselProps = {
  categories: HomepageCategory[];
  title: string;
};

export default function PurposeCategoryCarousel({ categories, title }: PurposeCategoryCarouselProps) {
  const [purposeDragging, setPurposeDragging] = useState(false);
  const purposeRowRef = useRef<HTMLDivElement>(null);
  const purposeDragRef = useRef({
    active: false,
    moved: false,
    hovered: false,
    pendingHref: "",
    suppressClick: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const shouldLoopPurposeCategories = categories.length > 1;
  const carouselCategories = shouldLoopPurposeCategories ? [...categories, ...categories] : categories;

  useEffect(() => {
    let animationFrame = 0;
    let initialized = false;
    let isRunning = false;

    function animatePurposeRow() {
      const row = purposeRowRef.current;

      if (!isRunning) {
        return;
      }

      if (row && shouldLoopPurposeCategories) {
        const resetPoint = row.scrollWidth / 2;

        if (!initialized && resetPoint > 0) {
          row.scrollLeft = resetPoint;
          initialized = true;
        }

        if (resetPoint > 0 && !purposeDragRef.current.active) {
          if (row.scrollLeft <= 1) {
            row.scrollLeft += resetPoint;
          }

          row.scrollLeft -= 1.35;
        }
      }

      animationFrame = requestAnimationFrame(animatePurposeRow);
    }

    function startPurposeRow() {
      cancelAnimationFrame(animationFrame);
      purposeDragRef.current.active = false;
      purposeDragRef.current.moved = false;
      purposeDragRef.current.pendingHref = "";
      purposeDragRef.current.suppressClick = false;
      setPurposeDragging(false);
      initialized = false;
      isRunning = true;
      animationFrame = requestAnimationFrame(animatePurposeRow);
    }

    function handleVisiblePurposeRow() {
      if (document.visibilityState === "visible") {
        startPurposeRow();
      }
    }

    startPurposeRow();
    window.addEventListener("pageshow", startPurposeRow);
    window.addEventListener("focus", startPurposeRow);
    document.addEventListener("visibilitychange", handleVisiblePurposeRow);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("pageshow", startPurposeRow);
      window.removeEventListener("focus", startPurposeRow);
      document.removeEventListener("visibilitychange", handleVisiblePurposeRow);
    };
  }, [shouldLoopPurposeCategories]);

  useEffect(() => {
    function resetPurposeLoop() {
      const row = purposeRowRef.current;

      if (!row) {
        return;
      }

      const resetPoint = row.scrollWidth / 2;

      if (shouldLoopPurposeCategories && resetPoint > 0) {
        row.scrollLeft = resetPoint;
      } else {
        row.scrollLeft = 0;
      }
    }

    resetPurposeLoop();
    window.addEventListener("resize", resetPurposeLoop);

    return () => window.removeEventListener("resize", resetPurposeLoop);
  }, [shouldLoopPurposeCategories]);

  function handlePurposePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const row = purposeRowRef.current;

    if (!row) {
      return;
    }

    purposeDragRef.current.active = true;
    purposeDragRef.current.moved = false;
    purposeDragRef.current.pendingHref =
      (event.target as HTMLElement).closest<HTMLAnchorElement>(".category-card")?.getAttribute("href") ?? "";
    purposeDragRef.current.startX = event.clientX;
    purposeDragRef.current.startScrollLeft = row.scrollLeft;
    setPurposeDragging(true);
    row.setPointerCapture(event.pointerId);
  }

  function handlePurposePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const row = purposeRowRef.current;

    if (!row || !purposeDragRef.current.active) {
      return;
    }

    const resetPoint = row.scrollWidth / 2;
    const dragDistance = event.clientX - purposeDragRef.current.startX;
    if (Math.abs(dragDistance) > 5) {
      purposeDragRef.current.moved = true;
      event.preventDefault();
    }

    let nextScrollLeft = purposeDragRef.current.startScrollLeft - dragDistance * 1.25;

    if (nextScrollLeft < 0) {
      nextScrollLeft += resetPoint;
    }

    if (nextScrollLeft >= resetPoint) {
      nextScrollLeft -= resetPoint;
    }

    row.scrollLeft = nextScrollLeft;
  }

  function handlePurposePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const row = purposeRowRef.current;
    const shouldNavigate = !purposeDragRef.current.moved && purposeDragRef.current.pendingHref;
    const nextHref = purposeDragRef.current.pendingHref;

    purposeDragRef.current.active = false;
    purposeDragRef.current.pendingHref = "";
    setPurposeDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }

    if (shouldNavigate) {
      purposeDragRef.current.suppressClick = true;
      window.location.assign(nextHref);
    }
  }

  function stopPurposeDrag() {
    purposeDragRef.current.active = false;
    purposeDragRef.current.pendingHref = "";
    setPurposeDragging(false);
  }

  function handlePurposeCardClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (purposeDragRef.current.moved || purposeDragRef.current.suppressClick) {
      event.preventDefault();
      purposeDragRef.current.moved = false;
      purposeDragRef.current.suppressClick = false;
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  return (
    <section className="purpose-section" id="purpose">
      <h2>{title}</h2>
      <div
        ref={purposeRowRef}
        className={purposeDragging ? "category-row dragging" : "category-row"}
        aria-label="Auto sliding vehicle body type list"
        onPointerDown={handlePurposePointerDown}
        onPointerMove={handlePurposePointerMove}
        onPointerUp={handlePurposePointerUp}
        onPointerCancel={handlePurposePointerUp}
        onMouseEnter={() => {
          purposeDragRef.current.hovered = true;
        }}
        onMouseLeave={() => {
          purposeDragRef.current.hovered = false;
          stopPurposeDrag();
        }}
      >
        <div className="category-track">
          {carouselCategories.map((category, index) => {
            const CategoryIcon = categoryIconByKey[category.iconKey || "car"] || Car;

            return (
              <a
                className="category-card"
                draggable={false}
                href={category.href}
                key={`${category.id}-${index}`}
                onClick={(event) => handlePurposeCardClick(event, category.href)}
              >
                <div>
                  <CategoryIcon size={34} />
                  <h3>{category.title}</h3>
                  <p>{category.copy}</p>
                </div>
                <span
                  className="category-card-image"
                  style={{ display: "block", height: 245, overflow: "hidden", position: "relative", width: "100%" }}
                >
                  <Image
                    src={category.image}
                    alt={category.imageAlt || `${category.title} vehicle detail`}
                    fill
                    sizes="(max-width: 860px) 280px, 30vw"
                    draggable={false}
                    suppressHydrationWarning
                  />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
