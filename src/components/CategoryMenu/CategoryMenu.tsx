import React, { useState } from "react";
import { useApplicationStore } from "@/state";
import "./CategoryMenu.css";

const BRANDS = ["Cars24", "TeamBHP", "CarInfo", "VehicleInfo"] as const;

const CATEGORIES = [
  "arrows",
  "brands",
  "commerce",
  "communications",
  "design",
  "editor",
  "finances",
  "games",
  "health & wellness",
  "maps & travel",
  "media",
  "nature",
  "objects",
  "office",
  "people",
  "system",
  "technology & development",
  "weather",
];

const CategoryMenu: React.FC = () => {
  const setSearchQuery = useApplicationStore.use.setSearchQuery();
  const current = useApplicationStore.use.searchQuery();
  const [brand, setBrand] = useState<(typeof BRANDS)[number]>("Cars24");

  return (
    <nav className="category-menu" aria-label="Icon library">
      <h1 className="brand">Autonaut Icons</h1>

      <div className="brand-group" role="tablist" aria-label="Brand">
        {BRANDS.map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={brand === b}
            className={`brand-btn ${brand === b ? "active" : ""}`}
            onClick={() => setBrand(b)}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="section-label">Categories</div>
      <ul className="categories" role="list">
        <li>
          <button
            className={`cat-btn ${current === "" ? "active" : ""}`}
            aria-pressed={current === ""}
            onClick={() => setSearchQuery("")}
          >
            All
          </button>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c}>
            <button
              className={`cat-btn ${current === c ? "active" : ""}`}
              aria-pressed={current === c}
              onClick={() => setSearchQuery(c)}
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default CategoryMenu;
