import { useEffect, useRef, useState } from "react";

import DownloadLibrary from "@/components/DownloadLibrary";
import { useAuth } from "@/lib/github";
import "./FabMenu.css";

/**
 * Floating action button following the WAI-ARIA disclosure pattern: the toggle
 * owns aria-expanded/aria-controls, Escape closes and returns focus to it, and
 * Up/Down move between actions. Targets are 44px for WCAG 2.2 (2.5.8).
 */
const FabMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, signIn, configured, signingIn } = useAuth();
  const guideUrl = `${import.meta.env.BASE_URL}guide.html`;

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  };

  // Focus the first action when the menu opens, so keyboard users land inside.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[data-fab-item]")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>("[data-fab-item]") ?? []
      );
      if (!items.length) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "ArrowDown"
          ? (at + 1) % items.length
          : (at - 1 + items.length) % items.length;
      items[next].focus();
    };

    const onPointer = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        e.target instanceof Node &&
        !wrapRef.current.contains(e.target)
      ) {
        close(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const loginLabel = !configured
    ? "CMS setup pending"
    : user
    ? `Signed in as @${user.login}`
    : signingIn
    ? "Waiting for GitHub…"
    : "Login as Admin";

  return (
    <div className="fab" ref={wrapRef}>
      <div
        className="fab-menu"
        id="fab-menu"
        ref={menuRef}
        hidden={!open}
        aria-label="Library actions"
      >
        <a
          className="fab-item"
          data-fab-item
          href={guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => close(false)}
        >
          <i className="ai ai-book" aria-hidden />
          <span>Instruction guide</span>
        </a>

        <DownloadLibrary
          className="fab-item"
          data-fab-item
          onOpen={() => close(false)}
        >
          <i className="ai ai-cloud-download" aria-hidden />
          <span>Download library</span>
        </DownloadLibrary>

        <button
          type="button"
          className="fab-item"
          data-fab-item
          disabled={!configured || !!user || signingIn}
          onClick={() => {
            signIn();
            close(false);
          }}
        >
          <i className="ai-fill ai-shield-keyhole" aria-hidden />
          <span>{loginLabel}</span>
        </button>
      </div>

      <button
        type="button"
        className="fab-toggle"
        ref={toggleRef}
        aria-expanded={open}
        aria-controls="fab-menu"
        aria-label={open ? "Close library actions" : "Open library actions"}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <i
          className={`ai ${open ? "ai-cross-small" : "ai-bars-two"} fab-toggle-icon`}
          aria-hidden
        />
      </button>
    </div>
  );
};

export default FabMenu;
