import React from "react";
import { useApplicationStore, type IconBrand } from "@/state";
import "./CategoryMenu.css";

const BRANDS: { key: IconBrand; label: string }[] = [
  { key: "default", label: "Default (sharp)" },
  { key: "cars24", label: "Cars24" },
  { key: "teambhp", label: "TeamBHP" },
  { key: "carinfo", label: "CarInfo" },
  { key: "vehicleinfo", label: "VehicleInfo" },
];

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
  const brand = useApplicationStore.use.iconBrand();
  const setBrand = useApplicationStore.use.setIconBrand();

  return (
    <nav className="category-menu" aria-label="Icon library">
      <h1 className="brand">Autonaut Icons</h1>

      <label className="brand-select" aria-label="Brand">
        <span className="brand-select-label">Brand</span>
        <select
          className="brand-select-control"
          value={brand}
          onChange={(e) => setBrand(e.target.value as IconBrand)}
        >
          {BRANDS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

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
