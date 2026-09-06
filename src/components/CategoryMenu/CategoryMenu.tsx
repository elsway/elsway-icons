import React, { useEffect, useMemo, useRef, useState } from "react";
import { icons, useApplicationStore, type IconBrand } from "@/state";
import { useAuth } from "@/lib/github";
import DownloadLibrary from "@/components/DownloadLibrary";
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

      <div className="section-label">Categories</div>
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

      <DownloadLibrary />
      <SidebarFooter />
    </nav>
  );
};

const SidebarFooter: React.FC = () => {
  const { user, canWrite, signIn, signOut, configured, signingIn } = useAuth();
  if (!configured) {
    return (
      <div className="sidebar-footer">
        <button className="login-btn" type="button" disabled>
          <i className="ai-fill ai-shield-keyhole login-btn-icon" aria-hidden />
          <span>Login as Admin</span>
        </button>
        <span className="login-hint">CMS setup pending</span>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="sidebar-footer">
        <button
          className="login-btn"
          type="button"
          onClick={signIn}
          disabled={signingIn}
        >
          <i className="ai-fill ai-shield-keyhole login-btn-icon" aria-hidden />
          <span>{signingIn ? "Waiting for GitHub…" : "Login as Admin"}</span>
        </button>
      </div>
    );
  }
  return (
    <div className="sidebar-footer">
      <div className="login-meta">
        <span className="login-email" title={user.login}>
          @{user.login}
        </span>
        <button type="button" className="login-signout" onClick={signOut}>
          sign out
        </button>
      </div>
      <span className={`login-hint ${canWrite ? "" : "warn"}`}>
        {canWrite
          ? "CMS active — edit icons in place"
          : "not a collaborator"}
      </span>
    </div>
  );
};

export default CategoryMenu;
