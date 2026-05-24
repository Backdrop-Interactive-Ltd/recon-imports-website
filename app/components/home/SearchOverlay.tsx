"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { HomepageSearchItem } from "../../homeTypes";

type SearchOverlayProps = {
  onClose: () => void;
  searchItems: HomepageSearchItem[];
};

export default function SearchOverlay({ onClose, searchItems }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const budget = 54;
  const filteredStock = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return searchItems.filter((item) => {
      const matchesBudget = item.price <= budget * 100000;
      const matchesQuery = !normalizedQuery || item.searchText.includes(normalizedQuery);

      return matchesBudget && matchesQuery;
    });
  }, [query, searchItems]);

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search inventory">
      <div className="search-modal">
        <button className="close-search" type="button" aria-label="Close search" onClick={onClose}>
          <X size={24} />
        </button>
        <h2>Search stock</h2>
        <label>
          <Search size={22} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by model, type, or year"
            suppressHydrationWarning
          />
        </label>
        <p>{filteredStock.length} vehicles match your current search.</p>
      </div>
    </div>
  );
}
