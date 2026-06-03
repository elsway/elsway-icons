import { Fragment, Suspense, useMemo, useRef } from "react";

import "./App.css";
import Toolbar from "@/components/Toolbar";
import IconGrid from "@/components/IconGrid";
import Panel from "@/components/IconGrid/Panel";
import CategoryMenu from "@/components/CategoryMenu";
import SearchInput from "@/components/SearchInput";
import ErrorBoundary from "@/components/ErrorBoundary";
import Notice from "@/components/Notice";
// import Recipes from "@/components/Recipes";
import { useCSSVariables, useLenis } from "@/hooks";
import { ApplicationTheme, useApplicationStore } from "@/state";

const errorFallback = <Notice message="Search error" />;
const waitingFallback = <Notice type="none" message="" />;

const App: React.FC<any> = () => {
  const isDark =
    useApplicationStore.use.applicationTheme() === ApplicationTheme.DARK;
  const selectionEntry = useApplicationStore.use.selectionEntry();
  const setSelectionEntry = useApplicationStore.use.setSelectionEntry();
  const hasSelection = !!selectionEntry;

  const leftRef = useRef<HTMLElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useLenis(leftRef);
  useLenis(gridScrollRef);
  useLenis(popoverRef);

  useCSSVariables(
    useMemo(
      () => ({
        "--foreground": isDark ? "white" : "#1a1a1a",
        "--foreground-card": isDark ? "white" : "#1a1a1a",
        "--foreground-secondary": isDark ? "var(--pewter)" : "#6a6a6a",
        "--background": isDark ? "var(--slate)" : "#ededed",
        "--background-card": isDark ? "var(--stone)" : "#ffffff",
        "--background-layer": isDark ? "var(--scrim)" : "var(--translucent)",
        "--border-card": isDark ? "var(--shadow)" : "rgba(0,0,0,0.08)",
        "--border-secondary": isDark ? "var(--scrim)" : "rgba(0,0,0,0.06)",
        "--hover-tabs": isDark ? "var(--slate-sheer)" : "rgba(0,0,0,0.04)",
        "--hover-buttons": isDark ? "var(--scrim)" : "rgba(0,0,0,0.06)",
      }),
      [isDark]
    )
  );

  return (
    <Fragment>
      <div className="two-col-shell primary">
        <aside className="pane left-rail" ref={leftRef}>
          <CategoryMenu />
        </aside>
        <main className="pane middle-pane">
          <div className="middle-search">
            <SearchInput />
          </div>
          <div className="grid-scroll" ref={gridScrollRef}>
            <ErrorBoundary fallback={errorFallback}>
              <Suspense fallback={waitingFallback}>
                <IconGrid />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {hasSelection && (
        <>
          <div
            className="popover-backdrop"
            onClick={() => setSelectionEntry(null)}
            aria-hidden="true"
          />
          <div
            className="popover"
            role="dialog"
            aria-modal="true"
            aria-label="Icon details"
            ref={popoverRef}
          >
            <div className="popover-section">
              <Toolbar />
            </div>
            <div className="popover-section popover-detail">
              <Panel />
            </div>
          </div>
        </>
      )}
    </Fragment>
  );
};

export default App;
