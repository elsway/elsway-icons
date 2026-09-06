import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const BrandDropdown: React.FC<{
  value: IconBrand;
  onChange: (v: IconBrand) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        e.target instanceof Node &&
        !wrapRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = BRAND_OPTIONS.find((o) => o.value === value) ?? BRAND_OPTIONS[0];

  return (
    <div
      ref={wrapRef}
      className={`brand-select-control ${open ? "is-open" : ""}`}
    >
      <button
        type="button"
        className="brand-select-trigger"
        aria-label="Brand"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected.key}</span>
        <i className="ai-fill ai-chevron-bottom brand-select-caret" aria-hidden />
      </button>
      {open && (
        <ul className="brand-select-menu" role="listbox">
          {BRAND_OPTIONS.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`brand-select-item ${
                o.value === value ? "is-selected" : ""
              }`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


type Category = { name: string; label: string; count: number };

/**
 * Narrow layouts get a trigger plus a full-screen list instead of the rail's
 * inline categories: the stacked rail can only spare a few rows, which makes
 * a 30-item list unusable. Which one shows is decided in CSS, so there is no
 * viewport listener and no layout thrash on resize.
 */
const CategoryPicker: React.FC<{
  categories: Category[];
  value: string;
  onSelect: (v: string) => void;
}> = ({ categories, value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = categories.find((c) => c.name === value) ?? categories[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // The list owns the scroll while it is up; the grid behind must not move.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    listRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="category-picker">
      <span className="section-label">Categories</span>
      <button
        type="button"
        ref={triggerRef}
        className="brand-select-trigger category-picker-trigger"
        aria-label="Category"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>{selected.label}</span>
        <span className="category-picker-meta">
          <span className="cat-count">{fmt(selected.count)}</span>
          <i className="ai-fill ai-chevron-bottom brand-select-caret" aria-hidden />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="category-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a category"
          >
            <header className="category-sheet-head">
              <h2>Categories</h2>
              <button
                type="button"
                className="category-sheet-close"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <i className="ai ai-cross-small" aria-hidden />
              </button>
            </header>
            <div className="category-sheet-list" ref={listRef}>
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`cat-btn ${c.name === value ? "active" : ""}`}
                  aria-pressed={c.name === value}
                  onClick={() => {
                    onSelect(c.name);
                    setOpen(false);
                    // Send focus back where it came from, not to <body>.
                    triggerRef.current?.focus();
                  }}
                >
                  <span className="cat-name">{c.label}</span>
                  <span className="cat-count">{fmt(c.count)}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

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

  const pickerCategories = useMemo(
    () => [
      { name: "", label: "All", count: totalIcons },
      ...CATEGORIES.map((c) => ({
        name: c,
        label: c,
        count: categoryCounts[c] || 0,
      })),
    ],
    [CATEGORIES, categoryCounts, totalIcons]
  );

  return (
    <nav className="category-menu" aria-label="Icon library">
      <h1
        className="brand"
        role="button"
        tabIndex={0}
        onClick={() => window.location.reload()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") window.location.reload();
        }}
      >
        Autonaut Icons
      </h1>

      <div className="brand-select-wrap" aria-label="Brand">
        <span className="brand-select-label">Brand</span>
        <BrandDropdown value={brand} onChange={setBrand} />
      </div>

      <CategoryPicker
        categories={pickerCategories}
        value={current}
        onSelect={setSearchQuery}
      />

      <div className="section-label categories-inline-label">Categories</div>
      <div className="categories-scroll">
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
                <span className="cat-count">
                  {fmt(categoryCounts[c] || 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

    </nav>
  );
};

export default CategoryMenu;
