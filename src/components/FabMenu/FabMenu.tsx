import { useCallback, useEffect, useRef, useState } from "react";

import DownloadLibrary from "@/components/DownloadLibrary";
import NewIconModal from "@/components/Cms/NewIconModal";
import { useAuth } from "@/lib/github";
import "./FabMenu.css";

/**
 * Floating action button following the WAI-ARIA disclosure pattern: the toggle
 * owns aria-expanded/aria-controls, Escape closes and returns focus to it, and
 * Up/Down move between actions. Targets are 44px for WCAG 2.2 (2.5.8).
 *
 * The menu stays mounted and animates on both edges via CSS transitions —
 * toggling `hidden` would snap it shut with no exit motion.
 */
const FabMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, canWrite, signIn, signOut, configured, signingIn } = useAuth();
  const [showNew, setShowNew] = useState(false);
  // Vercel serves guide.html at /guide (cleanUrls) and redirects the .html
  // form to it. The dev server has no such rewrite, so keep the extension
  // locally or the link 404s while developing.
  const guideUrl = `${import.meta.env.BASE_URL}guide${
    import.meta.env.DEV ? ".html" : ""
  }`;

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

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

    // pointerdown, not mousedown, so touch and pen dismiss it too. The toggle
    // lives inside wrapRef, so its own press never counts as "outside".
    const onPointer = (e: PointerEvent) => {
      if (
        wrapRef.current &&
        e.target instanceof Node &&
        !wrapRef.current.contains(e.target)
      ) {
        close(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const loginLabel = !configured
    ? "CMS setup pending"
    : signingIn
    ? "Waiting for GitHub…"
    : "Login as Admin";

  return (
    <div className="fab" ref={wrapRef} data-open={open}>
      <div
        className="fab-menu"
        id="fab-menu"
        ref={menuRef}
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
          <i className="ai-fill ai-book" aria-hidden />
          <span>Instruction guide</span>
        </a>

        <DownloadLibrary
          className="fab-item"
          data-fab-item
          onOpen={() => close(false)}
        >
          <i className="ai-fill ai-cloud-download" aria-hidden />
          <span>Download library</span>
        </DownloadLibrary>

        {canWrite && (
          <button
            type="button"
            className="fab-item"
            data-fab-item
            onClick={() => {
              close(false);
              setShowNew(true);
            }}
          >
            <i className="ai-fill ai-circle-plus" aria-hidden />
            <span>Add new icon</span>
          </button>
        )}

        {user ? (
          <button
            type="button"
            className="fab-item fab-item-danger"
            data-fab-item
            onClick={() => {
              signOut();
              close(false);
            }}
          >
            <i className="ai ai-arrow-box-left" aria-hidden />
            <span>Logout</span>
          </button>
        ) : (
          <button
            type="button"
            className="fab-item"
            data-fab-item
            disabled={!configured || signingIn}
            onClick={() => {
              signIn();
              close(false);
            }}
          >
            <i className="ai-fill ai-shield-keyhole" aria-hidden />
            <span>{loginLabel}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className="fab-toggle"
        ref={toggleRef}
        aria-expanded={open}
        aria-controls="fab-menu"
        aria-label={open ? "Close library actions" : "Open library actions"}
        // functional update: the handler must never read a stale `open`
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fab-toggle-icons" aria-hidden>
          <i className="ai ai-bars-two" />
          <i className="ai ai-cross-small" />
        </span>
      </button>

      {showNew && (
        <NewIconModal
          onClose={() => setShowNew(false)}
          onCreated={() => window.location.reload()}
        />
      )}
    </div>
  );
};

export default FabMenu;
