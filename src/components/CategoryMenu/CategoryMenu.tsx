import React, { useMemo } from "react";
import { icons, useApplicationStore, type IconBrand } from "@/state";
import "./CategoryMenu.css";

const BRANDS: { key: IconBrand; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "cars24", label: "Cars24" },
  { key: "teambhp", label: "TeamBHP" },
  { key: "carinfo", label: "CarInfo" },
  { key: "vehicleinfo", label: "VehicleInfo" },
];

const fmt = (n: number) => n.toLocaleString();

const CategoryMenu: React.FC = () => {
  const setSearchQuery = useApplicationStore.use.setSearchQuery();
  const current = useApplicationStore.use.searchQuery();
  const brand = useApplicationStore.use.iconBrand();
  const setBrand = useApplicationStore.use.setIconBrand();

  const { CATEGORIES, categoryCounts } = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of icons) {
      for (const c of i.categories as unknown as string[]) {
        map[c] = (map[c] || 0) + 1;
      }
    }
    return {
      CATEGORIES: Object.keys(map).sort(),
      categoryCounts: map,
    };
  }, []);
  const totalIcons = icons.length;

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
              {b.label} ({fmt(totalIcons)})
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
            <span className="cat-name">All</span>
            <span className="cat-count">{fmt(totalIcons)}</span>
          </button>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c}>
            <button
              className={`cat-btn ${current === c ? "active" : ""}`}
              aria-pressed={current === c}
              onClick={() => setSearchQuery(c)}
            >
              <span className="cat-name">{c}</span>
              <span className="cat-count">{fmt(categoryCounts[c] || 0)}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default CategoryMenu;
