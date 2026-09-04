import React, { useEffect, useRef, useState } from "react";

import { useApplicationStore, type IconBrand } from "@/state";
import "./BrandInput.css";

type BrandOption = { key: string; value: IconBrand };

const BRAND_OPTIONS: BrandOption[] = [
  { key: "Default", value: "default" },
  { key: "Cars24", value: "cars24" },
  { key: "TeamBHP", value: "teambhp" },
  { key: "CarInfo", value: "carinfo" },
  { key: "VehicleInfo", value: "vehicleinfo" },
];

const BrandInput: React.FC = () => {
  const value = useApplicationStore.use.iconBrand();
  const onChange = useApplicationStore.use.setIconBrand();
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

  const selected =
    BRAND_OPTIONS.find((o) => o.value === value) ?? BRAND_OPTIONS[0];

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
        aria-label="Brand"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected.key}</span>
        <span className="brand-select-caret" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
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

export default BrandInput;
