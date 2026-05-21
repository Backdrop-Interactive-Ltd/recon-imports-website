"use client";

import Image from "next/image";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

type SuggestedItem = {
  image: string;
  name: string;
  publicPath?: string;
  slug: string;
};

function getUniqueSuggestedItems(items: SuggestedItem[]) {
  const uniqueItems = new Map<string, SuggestedItem>();

  items.forEach((item) => {
    if (!uniqueItems.has(item.slug)) {
      uniqueItems.set(item.slug, item);
    }
  });

  return Array.from(uniqueItems.values());
}

export default function SuggestedCarousel({ items }: { items: SuggestedItem[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const hasDragged = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const uniqueItems = getUniqueSuggestedItems(items);
  const shouldLoopItems = uniqueItems.length > 4;
  const loopItems = shouldLoopItems ? [...uniqueItems, ...uniqueItems] : uniqueItems;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;

    if (!viewport) return;

    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = event.clientX;
    scrollStartX.current = viewport.scrollLeft;
    viewport.setPointerCapture(event.pointerId);
  }

  function dragCarousel(event: PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;

    if (!viewport || !isDragging) return;

    const distance = event.clientX - dragStartX.current;
    if (Math.abs(distance) > 5) {
      hasDragged.current = true;
    }

    viewport.scrollLeft = scrollStartX.current - distance;
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;

    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
  }

  function preventClickAfterDrag(event: MouseEvent<HTMLAnchorElement>) {
    if (hasDragged.current) {
      event.preventDefault();
      hasDragged.current = false;
    }
  }

  return (
    <div
      className={`product-suggested-viewport ${isDragging ? "is-dragging" : ""}`}
      onPointerCancel={stopDrag}
      onPointerDown={startDrag}
      onPointerLeave={stopDrag}
      onPointerMove={dragCarousel}
      onPointerUp={stopDrag}
      ref={viewportRef}
    >
      <div className={shouldLoopItems ? "product-suggested-track" : "product-suggested-track is-static"}>
        {loopItems.map((item, index) => (
          <a
            className="product-suggested-card"
            draggable={false}
            href={item.publicPath ?? `/brand-new/${item.slug}`}
            key={`${item.slug}-${index}`}
            onClick={preventClickAfterDrag}
          >
            <Image
              draggable={false}
              src={item.image}
              alt={item.name}
              width={600}
              height={600}
              loading="lazy"
              sizes="(max-width: 860px) 70vw, 260px"
              suppressHydrationWarning
            />
            <h3>{item.name}</h3>
          </a>
        ))}
      </div>
    </div>
  );
}
