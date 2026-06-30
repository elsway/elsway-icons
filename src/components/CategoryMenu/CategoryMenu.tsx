import React, { useMemo } from "react";
import Select from "react-dropdown-select";
import { icons, useApplicationStore, type IconBrand } from "@/state";
import "./CategoryMenu.css";

type BrandOption = { key: string; value: IconBrand };

const BRAND_OPTIONS: BrandOption[] = [
  { key: "Default", value: "default" },
  { key: "Cars24", value: "cars24" },
  { key: "TeamBHP", value: "teambhp" },
  { key: "CarInfo", value: "carinfo" },
  { key: "VehicleInfo", value: "vehicleinfo" },
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

  const currentBrand = [BRAND_OPTIONS.find((b) => b.value === brand)!];
  const handleBrandChange = (values: BrandOption[]) =>
    setBrand(values[0].value);

  return (
    <nav className="category-menu" aria-label="Icon library">
      <h1 className="brand">Autonaut Icons</h1>

      <div className="brand-select-wrap" aria-label="Brand">
        <span className="brand-select-label">Brand</span>
        <Select
          className="brand-select-control"
          options={BRAND_OPTIONS}
          values={currentBrand}
          searchable={false}
          labelField="key"
          onChange={handleBrandChange}
          itemRenderer={({
            item,
            itemIndex,
            state: { cursor, values },
            methods,
          }) => (
            <span
              role="option"
              aria-selected={item.key === values[0].key}
              className={`react-dropdown-select-item ${
                itemIndex === cursor ? "react-dropdown-select-item-active" : ""
              }`}
              onClick={() => methods.addItem(item)}
            >
              {item.key}
            </span>
          )}
          contentRenderer={({ state: { values } }) => (
            <div className="react-dropdown-select-content">
              {values[0].key}
            </div>
          )}
        />
      </div>

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
