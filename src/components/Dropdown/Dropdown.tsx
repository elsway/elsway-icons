import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./Dropdown.css";

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  /** Optional leading glyph, shown in the trigger and in the list. */
  icon?: React.ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name. Required: these dropdowns have no visible label. */
  label: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Select-only combobox, per the ARIA authoring practices.
 *
 * Focus stays on the trigger the whole time and `aria-activedescendant`
 * points at the option under the cursor. The alternative — moving DOM focus
 * into the list — means every option needs its own tabindex management, and
 * it was the shape that let the previous hand-rolled version ship options
 * that a keyboard could not reach at all.
 */
function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  disabled,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Opening lands the cursor on the current value, not the top of the list.
  const openList = useCallback(() => {
    setCursor(selectedIndex);
    setOpen(true);
  }, [selectedIndex]);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) onChange(option.value);
      close();
    },
    [options, onChange, close]
  );

  // Keep the active option in view when arrowing past the visible edge.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  useEffect(() => {
    if (!open) return;
    // pointerdown, so touch and pen dismiss it too.
    const onPointer = (e: PointerEvent) => {
      if (
        wrapRef.current &&
        e.target instanceof Node &&
        !wrapRef.current.contains(e.target)
      ) {
        close(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;

    if (!open) {
      // Down/Up/Enter/Space all open a collapsed select.
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        // Tab commits and moves on, matching a native select.
        commit(cursor);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(cursor);
        break;
      case "ArrowDown":
        e.preventDefault();
        setCursor((c) => Math.min(last, c + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
        break;
      case "Home":
        e.preventDefault();
        setCursor(0);
        break;
      case "End":
        e.preventDefault();
        setCursor(last);
        break;
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`dropdown ${open ? "is-open" : ""} ${className ?? ""}`}
    >
      <button
        type="button"
        ref={triggerRef}
        className="dropdown-trigger"
        role="combobox"
        aria-label={label}
        aria-controls={`${id}-list`}
        aria-expanded={open}
        aria-activedescendant={open ? `${id}-opt-${cursor}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="dropdown-value">
          {selected?.icon}
          {selected?.label}
        </span>
        <i className="ai-fill ai-chevron-bottom dropdown-caret" aria-hidden />
      </button>

      <ul
        ref={listRef}
        id={`${id}-list`}
        className="dropdown-menu"
        role="listbox"
        aria-label={label}
        hidden={!open}
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${id}-opt-${i}`}
            data-index={i}
            role="option"
            aria-selected={o.value === value}
            className={`dropdown-option ${
              i === cursor ? "is-active" : ""
            } ${o.value === value ? "is-selected" : ""}`}
            // The button keeps focus, so the press must not steal it.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => commit(i)}
            onPointerEnter={() => setCursor(i)}
          >
            {o.icon}
            {o.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dropdown;
