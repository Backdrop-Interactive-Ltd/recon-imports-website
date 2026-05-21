"use client";

import { useEffect } from "react";

export default function BfcacheRestore() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      const navigationEntries = performance.getEntriesByType?.("navigation") ?? [];
      const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
      const navigationType = navigationEntry?.type ?? "";

      if (window.location.pathname === "/" && (event.persisted || navigationType === "back_forward")) {
        window.location.reload();
      }
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
