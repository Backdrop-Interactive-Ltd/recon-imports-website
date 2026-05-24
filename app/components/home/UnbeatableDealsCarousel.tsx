"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getCarPublicPath } from "../../../lib/carPublicRoutes";
import type { CarInventoryItem } from "../../car-stocks/inventory";
import { formatPrice } from "../../../lib/formatPrice";

function getUniqueStockItems(items: CarInventoryItem[]) {
  const uniqueItems = new Map<string, CarInventoryItem>();

  items.forEach((item) => {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    }
  });

  return Array.from(uniqueItems.values());
}

type UnbeatableDealsCarouselProps = {
  deals: CarInventoryItem[];
};

export default function UnbeatableDealsCarousel({ deals }: UnbeatableDealsCarouselProps) {
  const [stockDragging, setStockDragging] = useState(false);
  const stockRowRef = useRef<HTMLDivElement>(null);
  const stockDragRef = useRef({
    active: false,
    moved: false,
    hovered: false,
    pendingHref: "",
    suppressClick: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const latestStock = getUniqueStockItems(deals);
  const shouldLoopStock = latestStock.length > 5;
  const carouselStock = shouldLoopStock ? [...latestStock, ...latestStock] : latestStock;

  useEffect(() => {
    let animationFrame = 0;
    let isRunning = false;

    function animateStockRow() {
      const row = stockRowRef.current;

      if (!isRunning) {
        return;
      }

      if (row && shouldLoopStock && !stockDragRef.current.active && !stockDragRef.current.hovered) {
        const resetPoint = row.scrollWidth / 2;
        row.scrollLeft += 0.65;

        if (row.scrollLeft >= resetPoint) {
          row.scrollLeft -= resetPoint;
        }
      }

      animationFrame = requestAnimationFrame(animateStockRow);
    }

    function startStockRow() {
      cancelAnimationFrame(animationFrame);
      stockDragRef.current.active = false;
      stockDragRef.current.moved = false;
      stockDragRef.current.pendingHref = "";
      stockDragRef.current.suppressClick = false;
      isRunning = true;
      animationFrame = requestAnimationFrame(animateStockRow);
    }

    function handleVisibleStockRow() {
      if (document.visibilityState === "visible") {
        startStockRow();
      }
    }

    startStockRow();
    window.addEventListener("pageshow", startStockRow);
    window.addEventListener("focus", startStockRow);
    document.addEventListener("visibilitychange", handleVisibleStockRow);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("pageshow", startStockRow);
      window.removeEventListener("focus", startStockRow);
      document.removeEventListener("visibilitychange", handleVisibleStockRow);
    };
  }, [shouldLoopStock]);

  useEffect(() => {
    if (stockRowRef.current) {
      stockRowRef.current.scrollLeft = 0;
    }
  }, [deals]);

  function handleStockPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;

    if (!row) {
      return;
    }

    stockDragRef.current.active = true;
    stockDragRef.current.moved = false;
    stockDragRef.current.pendingHref =
      (event.target as HTMLElement).closest<HTMLAnchorElement>(".deals-stock-card")?.getAttribute("href") ?? "";
    stockDragRef.current.suppressClick = false;
    stockDragRef.current.startX = event.clientX;
    stockDragRef.current.startScrollLeft = row.scrollLeft;
    setStockDragging(true);
    row.setPointerCapture(event.pointerId);
  }

  function handleStockPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;

    if (!row || !stockDragRef.current.active) {
      return;
    }

    const resetPoint = row.scrollWidth / 2;
    const dragDistance = event.clientX - stockDragRef.current.startX;
    if (Math.abs(dragDistance) > 5) {
      stockDragRef.current.moved = true;
      event.preventDefault();
    }
    let nextScrollLeft = stockDragRef.current.startScrollLeft - dragDistance * 1.35;

    if (shouldLoopStock && resetPoint > 0) {
      if (nextScrollLeft < 0) {
        nextScrollLeft += resetPoint;
      }

      if (nextScrollLeft >= resetPoint) {
        nextScrollLeft -= resetPoint;
      }
    }

    row.scrollLeft = nextScrollLeft;
  }

  function handleStockPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;
    const shouldNavigate = !stockDragRef.current.moved && stockDragRef.current.pendingHref;
    const nextHref = stockDragRef.current.pendingHref;

    stockDragRef.current.active = false;
    stockDragRef.current.pendingHref = "";
    setStockDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }

    if (shouldNavigate) {
      stockDragRef.current.suppressClick = true;
      window.location.assign(nextHref);
    }
  }

  function cancelStockDrag(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;

    stockDragRef.current.active = false;
    stockDragRef.current.pendingHref = "";
    setStockDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }
  }

  function stopStockDrag() {
    stockDragRef.current.active = false;
    stockDragRef.current.pendingHref = "";
    setStockDragging(false);
  }

  function handleDealCardClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (stockDragRef.current.moved || stockDragRef.current.suppressClick) {
      event.preventDefault();
      stockDragRef.current.moved = false;
      stockDragRef.current.suppressClick = false;
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  return (
    <section className="deals-section" id="deals">
      <div className="section-heading">
        <h1>Unbeatable Deals</h1>
        <p>Bringing you the best prices with a commitment to customer care.</p>
      </div>
      <a className="see-all-link" href="/brand-new">
        See All
      </a>

      <div
        ref={stockRowRef}
        className={stockDragging ? "stock-row dragging" : "stock-row"}
        aria-label="Auto sliding vehicle stock list"
        onPointerDown={handleStockPointerDown}
        onPointerMove={handleStockPointerMove}
        onPointerUp={handleStockPointerUp}
        onPointerCancel={cancelStockDrag}
        onMouseEnter={() => {
          stockDragRef.current.hovered = true;
        }}
        onMouseLeave={() => {
          stockDragRef.current.hovered = false;
          stopStockDrag();
        }}
      >
        <div className="stock-track">
          {carouselStock.map((item, index) => {
            const itemPath = item.publicPath ?? getCarPublicPath({ id: item.id, type: item.type });

            return (
              <a
                className="stock-card deals-stock-card"
                draggable={false}
                href={itemPath}
                key={`${item.id}-${index}`}
                onClick={(event) => handleDealCardClick(event, itemPath)}
              >
                {item.saleStatus === "Sold" ? <span className="stock-sale-badge">Sold</span> : null}
                <Image
                  src={item.image}
                  alt={item.name}
                  width={340}
                  height={340}
                  loading="lazy"
                  sizes="(max-width: 760px) 78vw, 340px"
                  draggable={false}
                  suppressHydrationWarning
                />
                <div className="stock-card-body">
                  <h2>{item.name}</h2>
                  <p>{item.year}</p>
                  <div className="stock-meta">
                    <span>{item.fuel}</span>
                    <span>{item.type}</span>
                    <span>{item.mileage}</span>
                  </div>
                  <strong>{formatPrice(item.price)}</strong>
                  <span className="stock-details-link">Show Details</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
